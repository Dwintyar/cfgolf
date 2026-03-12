import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LeaderboardRow {
  event_id: string;
  contestant_id: string;
  player_id: string;
  status: string;
  hcp: number | null;
  flight_id: string | null;
  total_gross: number;
  total_net: number;
}

interface Category {
  id: string;
  category_name: string;
  flight_id: string | null;
  rank_count: number;
  calculation_type: string;
}

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

    // 1. Get event and its tour_id
    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("id, tour_id")
      .eq("id", eventId)
      .single();

    if (eventErr || !event) {
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Load leaderboard data (competitors only)
    const { data: leaderboard, error: lbErr } = await supabase
      .from("event_leaderboard")
      .select("*")
      .eq("event_id", eventId)
      .eq("status", "competitor");

    if (lbErr) {
      return new Response(JSON.stringify({ error: lbErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!leaderboard || leaderboard.length === 0) {
      return new Response(
        JSON.stringify({ error: "No competitor data on leaderboard" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Load winner categories for this tour
    const { data: categories, error: catErr } = await supabase
      .from("tournament_winner_categories")
      .select("*")
      .eq("tour_id", event.tour_id)
      .order("display_order");

    if (catErr || !categories || categories.length === 0) {
      return new Response(
        JSON.stringify({ error: "No winner categories configured for this tour" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Delete existing results for this event
    await supabase.from("event_results").delete().eq("event_id", eventId);

    // 5. Calculate winners per category
    const results: Array<{
      event_id: string;
      contestant_id: string;
      category_id: string;
      rank_position: number;
      score_value: number;
    }> = [];

    // Track already-won contestants to avoid duplicate prizes (optional: not enforced here)
    for (const cat of categories as Category[]) {
      // Filter by flight if category is flight-specific
      let pool = [...(leaderboard as LeaderboardRow[])];
      if (cat.flight_id) {
        pool = pool.filter((r) => r.flight_id === cat.flight_id);
      }

      // Sort by calculation type
      if (cat.calculation_type === "gross") {
        pool.sort((a, b) => a.total_gross - b.total_gross);
      } else {
        pool.sort((a, b) => a.total_net - b.total_net);
      }

      // Take top N
      const winners = pool.slice(0, cat.rank_count);

      for (let i = 0; i < winners.length; i++) {
        const w = winners[i];
        results.push({
          event_id: eventId,
          contestant_id: w.contestant_id,
          category_id: cat.id,
          rank_position: i + 1,
          score_value: cat.calculation_type === "gross" ? w.total_gross : w.total_net,
        });
      }
    }

    // 6. Insert results
    if (results.length > 0) {
      const { error: insertErr } = await supabase.from("event_results").insert(results);
      if (insertErr) {
        return new Response(JSON.stringify({ error: insertErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        event_id: eventId,
        categories_processed: categories.length,
        winners_calculated: results.length,
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
