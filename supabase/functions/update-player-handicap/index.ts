import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SANDBAGGING_THRESHOLD = 5; // net score beats expected by this many strokes

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const eventId: string = body.event_id;

    if (!eventId) {
      return new Response(JSON.stringify({ error: "event_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Get event with course par
    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("id, tour_id, course_id, courses(par)")
      .eq("id", eventId)
      .single();

    if (eventErr || !event) {
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const coursePar = (event.courses as any)?.par ?? 72;

    // 2. Get leaderboard data for this event
    const { data: leaderboard, error: lbErr } = await supabase
      .from("event_leaderboard")
      .select("*")
      .eq("event_id", eventId)
      .eq("status", "competitor");

    if (lbErr || !leaderboard || leaderboard.length === 0) {
      return new Response(
        JSON.stringify({ error: "No competitor scores found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{
      player_id: string;
      old_hcp: number;
      new_hcp: number;
      sandbagging_flag: boolean;
    }> = [];

    for (const entry of leaderboard) {
      const playerId = entry.player_id;
      const oldHcp = entry.hcp ?? 0;
      const grossScore = entry.total_gross;
      const netScore = entry.total_net;

      // 3. Get last 10 handicap history records for this player
      const { data: history } = await supabase
        .from("handicap_history")
        .select("net_score")
        .eq("player_id", playerId)
        .order("created_at", { ascending: false })
        .limit(9); // last 9 + current = 10

      // Collect net scores (including current)
      const allNetScores = [
        netScore,
        ...(history ?? []).map((h: any) => h.net_score).filter((s: any) => s != null),
      ];

      // MVP formula: new_hcp = average(net_scores) - course_par
      const avgNet = allNetScores.reduce((a: number, b: number) => a + b, 0) / allNetScores.length;
      const newHcp = Math.round(avgNet - coursePar);
      const clampedHcp = Math.max(0, Math.min(54, newHcp)); // clamp 0-54

      // 4. Sandbagging detection
      // Expected net score ≈ coursePar (since net = gross - hcp, good play = par)
      // If actual net is significantly below par, flag it
      const expectedNet = coursePar;
      const sandbaggingFlag = netScore < (expectedNet - SANDBAGGING_THRESHOLD);

      // 5. Insert handicap history
      const { error: insertErr } = await supabase.from("handicap_history").insert({
        player_id: playerId,
        event_id: eventId,
        old_hcp: oldHcp,
        new_hcp: clampedHcp,
        gross_score: grossScore,
        net_score: netScore,
        sandbagging_flag: sandbaggingFlag,
      });

      if (insertErr) {
        console.error(`Failed to insert history for ${playerId}:`, insertErr);
        continue;
      }

      // 6. Update player profile handicap
      await supabase
        .from("profiles")
        .update({ handicap: clampedHcp })
        .eq("id", playerId);

      results.push({
        player_id: playerId,
        old_hcp: oldHcp,
        new_hcp: clampedHcp,
        sandbagging_flag: sandbaggingFlag,
      });
    }

    const flaggedCount = results.filter((r) => r.sandbagging_flag).length;

    return new Response(
      JSON.stringify({
        success: true,
        event_id: eventId,
        players_updated: results.length,
        sandbagging_flags: flaggedCount,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
