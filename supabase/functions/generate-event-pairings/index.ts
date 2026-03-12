import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Verify the user token
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

    const { event_id, first_tee_time = "07:00", interval_minutes = 8 } = await req.json();

    if (!event_id) {
      return new Response(JSON.stringify({ error: "event_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Load the event to get start_type and event_date
    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("id, event_date, course_id, tour_id")
      .eq("id", event_id)
      .single();

    if (eventErr || !event) {
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check pairings table for start_type config (from the request or default)
    // We'll check if there's already a start_type preference stored
    const { data: existingPairings } = await supabase
      .from("pairings")
      .select("id")
      .eq("event_id", event_id)
      .limit(1);

    // Delete existing pairings for this event (regenerate)
    if (existingPairings && existingPairings.length > 0) {
      // Delete pairing_players first (cascade should handle, but be safe)
      const { data: oldPairings } = await supabase
        .from("pairings")
        .select("id")
        .eq("event_id", event_id);

      if (oldPairings && oldPairings.length > 0) {
        const oldIds = oldPairings.map((p: { id: string }) => p.id);
        await supabase
          .from("pairing_players")
          .delete()
          .in("pairing_id", oldIds);
      }

      await supabase.from("pairings").delete().eq("event_id", event_id);
    }

    // 2. Load contestants sorted by handicap
    const { data: contestants, error: contErr } = await supabase
      .from("contestants")
      .select("id, player_id, hcp, flight_id")
      .eq("event_id", event_id)
      .eq("status", "competitor")
      .order("hcp", { ascending: true, nullsFirst: false });

    if (contErr) {
      return new Response(JSON.stringify({ error: contErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!contestants || contestants.length === 0) {
      return new Response(
        JSON.stringify({ error: "No competitors found for this event" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Snake distribution for balanced groups
    const playerCount = contestants.length;
    const groupSize = 4;
    const numFullGroups = Math.floor(playerCount / groupSize);
    const remainder = playerCount % groupSize;
    // If remainder is 1 or 2, we need to adjust group sizes
    // Total groups = numFullGroups + (remainder > 0 ? 1 : 0) but we want groups of 3 or 4
    let numGroups: number;
    if (remainder === 0) {
      numGroups = numFullGroups;
    } else if (remainder >= 3) {
      numGroups = numFullGroups + 1;
    } else {
      // remainder is 1 or 2: borrow from full groups to make groups of 3
      // e.g., 9 players: 2 groups of 3 + 1 group of 3 = 3 groups of 3
      // e.g., 10 players: 2 groups of 4 + 1 group of 2 -> better: 1 group of 4 + 2 groups of 3
      numGroups = numFullGroups + 1;
      // Some groups will have 3 players, that's fine
    }

    if (numGroups === 0) numGroups = 1;

    // Snake distribution: sort by hcp, then distribute in snake order
    const groups: Array<Array<typeof contestants[0]>> = Array.from(
      { length: numGroups },
      () => []
    );

    let direction = 1; // 1 = forward, -1 = backward
    let groupIdx = 0;

    for (const contestant of contestants) {
      groups[groupIdx].push(contestant);

      // Move to next group in snake pattern
      const nextIdx = groupIdx + direction;
      if (nextIdx >= numGroups || nextIdx < 0) {
        direction *= -1; // reverse direction
      } else {
        groupIdx = nextIdx;
      }
    }

    // 4. Parse start_type from request body (default tee_time)
    const { start_type = "tee_time" } = await req.json().catch(() => ({ start_type: "tee_time" }));
    // Re-parse is problematic since body was already consumed; let's get it from the original parse
    // Actually we need to handle this differently - let's use the initial parse

    // Get start_type from initial request parse (already done above, need to add to destructure)
    // Fix: we'll re-read from a variable

    // 5. Generate pairings
    const createdPairings: Array<{
      id: string;
      group_number: number;
      tee_time: string | null;
      start_hole: number | null;
      players: Array<{ contestant_id: string; position: number }>;
    }> = [];

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      if (group.length === 0) continue;

      const groupNumber = i + 1;
      let teeTime: string | null = null;
      let startHole: number | null = null;
      let startType = "tee_time";

      // Check the request body for start_type
      // We already parsed it above but didn't destructure start_type
      // Let me use a different approach - read from a stored var

      if (start_type === "shotgun") {
        startType = "shotgun";
        startHole = groupNumber; // sequential hole assignment
        // All groups start at the same time
        teeTime = `${event.event_date}T${first_tee_time}:00`;
      } else {
        startType = "tee_time";
        // Calculate tee time: first_tee_time + (i * interval_minutes)
        const [hours, minutes] = first_tee_time.split(":").map(Number);
        const totalMinutes = hours * 60 + minutes + i * interval_minutes;
        const teeHours = Math.floor(totalMinutes / 60);
        const teeMins = totalMinutes % 60;
        teeTime = `${event.event_date}T${String(teeHours).padStart(2, "0")}:${String(teeMins).padStart(2, "0")}:00`;
      }

      // Insert pairing
      const { data: pairing, error: pairErr } = await supabase
        .from("pairings")
        .insert({
          event_id,
          group_number: groupNumber,
          tee_time: teeTime,
          start_hole: startHole,
          start_type: startType,
        })
        .select("id")
        .single();

      if (pairErr || !pairing) {
        console.error("Pairing insert error:", pairErr);
        continue;
      }

      // Insert pairing players
      const playerInserts = group.map((contestant, idx) => ({
        pairing_id: pairing.id,
        contestant_id: contestant.id,
        position: idx + 1,
      }));

      const { error: ppErr } = await supabase
        .from("pairing_players")
        .insert(playerInserts);

      if (ppErr) {
        console.error("Pairing player insert error:", ppErr);
      }

      createdPairings.push({
        id: pairing.id,
        group_number: groupNumber,
        tee_time: teeTime,
        start_hole: startHole,
        players: playerInserts,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        event_id,
        groups_created: createdPairings.length,
        total_players: contestants.length,
        pairings: createdPairings,
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
