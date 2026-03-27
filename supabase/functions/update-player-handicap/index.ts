import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SANDBAGGING_THRESHOLD = 5;

// Bobot Reference HCP per source
const WEIGHTS = {
  interclub: 0.50,
  internal:  0.35,
  personal:  0.15,
};

// Hitung Reference HCP dari semua source yang ada
async function calculateReferenceHcp(
  supabase: any,
  playerId: string
): Promise<number | null> {
  const { data: history } = await supabase
    .from("handicap_history")
    .select("new_hcp, source_type, created_at")
    .eq("player_id", playerId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (!history?.length) return null;

  // Group by source, ambil 10 terbaru per source
  const bySource: Record<string, number[]> = {
    interclub: [],
    internal: [],
    personal: [],
  };

  for (const h of history) {
    const src = h.source_type ?? "internal";
    if (bySource[src] && bySource[src].length < 10) {
      bySource[src].push(h.new_hcp);
    }
  }

  // Hitung average per source
  const avgBySource: Record<string, number | null> = {
    interclub: null,
    internal: null,
    personal: null,
  };

  for (const [src, scores] of Object.entries(bySource)) {
    if (scores.length > 0) {
      avgBySource[src] = scores.reduce((a, b) => a + b, 0) / scores.length;
    }
  }

  // Weighted average — hanya source yang punya data
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [src, avg] of Object.entries(avgBySource)) {
    if (avg !== null) {
      const w = WEIGHTS[src as keyof typeof WEIGHTS] ?? 0;
      weightedSum += avg * w;
      totalWeight += w;
    }
  }

  if (totalWeight === 0) return null;

  const ref = Math.max(0, Math.min(54, Math.round((weightedSum / totalWeight) * 10) / 10));
  return ref;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { event_id } = await req.json();
    if (!event_id) {
      return new Response(JSON.stringify({ error: "event_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get event with tour + club info
    const { data: event } = await supabase
      .from("events")
      .select("id, tour_id, courses(par), tours(organizer_club_id, tournament_type, clubs!tours_organizer_club_id_fkey(is_personal))")
      .eq("id", event_id)
      .single();

    if (!event) {
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth: club admin OR any club admin (fallback)
    const organizerClubId = (event.tours as any)?.organizer_club_id;
    let authorized = false;

    if (organizerClubId) {
      const { data: m } = await supabase.from("members").select("role")
        .eq("user_id", user.id).eq("club_id", organizerClubId)
        .in("role", ["owner", "admin"]).maybeSingle();
      if (m) authorized = true;
    }
    if (!authorized) {
      const { data: anyAdmin } = await supabase.from("members").select("role")
        .eq("user_id", user.id).in("role", ["owner", "admin"]).limit(1).maybeSingle();
      if (anyAdmin) authorized = true;
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine source_type
    const tourType = (event.tours as any)?.tournament_type ?? "internal";
    const isPersonalClub = (event.tours as any)?.clubs?.is_personal === true;
    const sourceType: "personal" | "internal" | "interclub" =
      isPersonalClub ? "personal" :
      tourType === "interclub" ? "interclub" : "internal";

    const coursePar = (event.courses as any)?.par ?? 72;
    const tourId = event.tour_id;

    // Get leaderboard
    const { data: leaderboard } = await supabase
      .from("event_leaderboard")
      .select("*")
      .eq("event_id", event_id)
      .eq("status", "competitor");

    if (!leaderboard?.length) {
      return new Response(JSON.stringify({ error: "No scores found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const entry of leaderboard) {
      const playerId = entry.player_id;
      const grossScore = entry.total_gross;
      const netScore = entry.total_net;

      // Current tournament HCP
      const { data: tourPlayer } = await supabase
        .from("tour_players")
        .select("hcp_tour, hcp_at_registration")
        .eq("tour_id", tourId)
        .eq("player_id", playerId)
        .maybeSingle();

      const currentTourHcp = tourPlayer?.hcp_tour ?? tourPlayer?.hcp_at_registration ?? entry.hcp ?? 0;

      // History for this source within this tournament
      const { data: tourHistory } = await supabase
        .from("handicap_history")
        .select("net_score")
        .eq("player_id", playerId)
        .eq("tour_id", tourId)
        .order("created_at", { ascending: false })
        .limit(9);

      // New tournament HCP
      const allNetScores = [
        netScore,
        ...(tourHistory ?? []).map((h: any) => h.net_score).filter((s: any) => s != null),
      ];
      const avgNet = allNetScores.reduce((a: number, b: number) => a + b, 0) / allNetScores.length;
      const newTourHcp = Math.max(0, Math.min(54, Math.round(avgNet - coursePar)));

      const sandbaggingFlag = netScore < (coursePar - SANDBAGGING_THRESHOLD);

      // Insert handicap_history WITH source_type
      await supabase.from("handicap_history").insert({
        player_id: playerId,
        event_id: event_id,
        tour_id: tourId,
        old_hcp: currentTourHcp,
        new_hcp: newTourHcp,
        gross_score: grossScore,
        net_score: netScore,
        sandbagging_flag: sandbaggingFlag,
        source_type: sourceType,
      });

      // Update tournament HCP
      await supabase.from("tour_players")
        .update({ hcp_tour: newTourHcp })
        .eq("tour_id", tourId)
        .eq("player_id", playerId);

      // Update source-specific HCP on profiles
      if (sourceType === "personal") {
        await supabase.from("profiles")
          .update({ personal_hcp: newTourHcp })
          .eq("id", playerId);
      } else if (sourceType === "internal") {
        await supabase.from("profiles")
          .update({ club_hcp: newTourHcp })
          .eq("id", playerId);
      }
      // interclub: does not directly update personal/club HCP
      // (will be reflected in reference via weighted average)

      // Recalculate Reference HCP from all sources
      const newRefHcp = await calculateReferenceHcp(supabase, playerId);
      if (newRefHcp !== null) {
        await supabase.from("profiles")
          .update({ handicap: newRefHcp })
          .eq("id", playerId);
      }

      results.push({
        player_id: playerId,
        source_type: sourceType,
        old_hcp: currentTourHcp,
        new_tour_hcp: newTourHcp,
        new_reference_hcp: newRefHcp,
        sandbagging_flag: sandbaggingFlag,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        event_id,
        tour_id: tourId,
        source_type: sourceType,
        players_updated: results.length,
        sandbagging_flags: results.filter((r) => r.sandbagging_flag).length,
        note: `${sourceType} HCP updated. Reference HCP recalculated.`,
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
