import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SANDBAGGING_THRESHOLD = 5;

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

    // Verify caller
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

    const { event_id } = await req.json();
    if (!event_id) {
      return new Response(JSON.stringify({ error: "event_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get event with tour and course
    const { data: event } = await supabase
      .from("events")
      .select("id, tour_id, courses(par), tours(organizer_club_id, tournament_type)")
      .eq("id", event_id)
      .single();

    if (!event) {
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth check: must be club admin of organizer
    const organizerClubId = (event.tours as any)?.organizer_club_id;
    if (!organizerClubId) {
      return new Response(JSON.stringify({ error: "Tour configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: membership } = await supabase
      .from("members")
      .select("role")
      .eq("user_id", user.id)
      .eq("club_id", organizerClubId)
      .in("role", ["owner", "admin"])
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const coursePar = (event.courses as any)?.par ?? 72;
    const tourId = event.tour_id;

    // Get leaderboard for this event
    const { data: leaderboard } = await supabase
      .from("event_leaderboard")
      .select("*")
      .eq("event_id", event_id)
      .eq("status", "competitor");

    if (!leaderboard?.length) {
      return new Response(JSON.stringify({ error: "No scores found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{
      player_id: string;
      old_hcp: number;
      new_hcp: number;
      sandbagging_flag: boolean;
    }> = [];

    for (const entry of leaderboard) {
      const playerId = entry.player_id;
      const grossScore = entry.total_gross;
      const netScore = entry.total_net;

      // Get current tournament HCP (from tour_players, NOT profiles)
      const { data: tourPlayer } = await supabase
        .from("tour_players")
        .select("hcp_tour, hcp_at_registration")
        .eq("tour_id", tourId)
        .eq("player_id", playerId)
        .maybeSingle();

      const currentTourHcp = tourPlayer?.hcp_tour
        ?? tourPlayer?.hcp_at_registration
        ?? entry.hcp
        ?? 0;

      // Get previous net scores IN THIS TOURNAMENT ONLY
      const { data: tourHistory } = await supabase
        .from("handicap_history")
        .select("net_score")
        .eq("player_id", playerId)
        .eq("tour_id", tourId)
        .order("created_at", { ascending: false })
        .limit(9);

      // Calculate new tournament HCP
      const allNetScores = [
        netScore,
        ...(tourHistory ?? []).map((h: any) => h.net_score).filter((s: any) => s != null),
      ];

      const avgNet = allNetScores.reduce((a: number, b: number) => a + b, 0) / allNetScores.length;
      const newTourHcp = Math.max(0, Math.min(54, Math.round(avgNet - coursePar)));

      // Sandbagging check against tournament HCP
      const sandbaggingFlag = netScore < (coursePar - SANDBAGGING_THRESHOLD);

      // Insert to handicap_history WITH tour_id
      await supabase.from("handicap_history").insert({
        player_id: playerId,
        event_id: event_id,
        tour_id: tourId,
        old_hcp: currentTourHcp,
        new_hcp: newTourHcp,
        gross_score: grossScore,
        net_score: netScore,
        sandbagging_flag: sandbaggingFlag,
      });

      // Update ONLY tournament HCP, NOT personal HCP
      await supabase
        .from("tour_players")
        .update({ hcp_tour: newTourHcp })
        .eq("tour_id", tourId)
        .eq("player_id", playerId);

      // DO NOT update profiles.handicap

      results.push({
        player_id: playerId,
        old_hcp: currentTourHcp,
        new_hcp: newTourHcp,
        sandbagging_flag: sandbaggingFlag,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        event_id,
        tour_id: tourId,
        players_updated: results.length,
        sandbagging_flags: results.filter((r) => r.sandbagging_flag).length,
        note: "Tournament HCP updated. Personal HCP unchanged.",
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
