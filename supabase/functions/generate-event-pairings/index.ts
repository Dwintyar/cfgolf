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
    const firstTeeTime: string = body.first_tee_time ?? "07:00";
    const intervalMinutes: number = body.interval_minutes ?? 8;
    const startType: string = body.start_type ?? "tee_time";

    if (!eventId) {
      return new Response(JSON.stringify({ error: "event_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Load event with tour's organizer club
    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("id, event_date, course_id, tour_id, tours(organizer_club_id)")
      .eq("id", eventId)
      .single();

    if (eventErr || !event) {
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorization: caller must be owner/admin of the organizer club
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

    // 2. Delete existing pairings for this event
    const { data: oldPairings } = await supabase
      .from("pairings")
      .select("id")
      .eq("event_id", eventId);

    if (oldPairings && oldPairings.length > 0) {
      const oldIds = oldPairings.map((p: { id: string }) => p.id);
      await supabase.from("pairing_players").delete().in("pairing_id", oldIds);
      await supabase.from("pairings").delete().eq("event_id", eventId);
    }

    // 3. Load competitors sorted by hcp
    const { data: contestants, error: contErr } = await supabase
      .from("contestants")
      .select("id, player_id, hcp, flight_id")
      .eq("event_id", eventId)
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

    // 4. Snake distribution into groups of 3-4
    const playerCount = contestants.length;
    let numGroups: number;

    if (playerCount <= 4) {
      numGroups = 1;
    } else {
      // Try groups of 4 first
      numGroups = Math.ceil(playerCount / 4);
      // If any group would have < 3 players, reduce groups
      // Minimum per group should be 3
      while (numGroups > 1 && Math.floor(playerCount / numGroups) < 3) {
        numGroups--;
      }
    }

    const groups: Array<Array<typeof contestants[0]>> = Array.from(
      { length: numGroups },
      () => []
    );

    // Snake: row 0 → left-to-right, row 1 → right-to-left, etc.
    for (let i = 0; i < contestants.length; i++) {
      const row = Math.floor(i / numGroups);
      const col = i % numGroups;
      const groupIdx = row % 2 === 0 ? col : numGroups - 1 - col;
      groups[groupIdx].push(contestants[i]);
    }

    // 5. Create pairings with tee times or shotgun holes
    const createdPairings: Array<{
      id: string;
      group_number: number;
      tee_time: string | null;
      start_hole: number | null;
      start_type: string;
      players: Array<{ contestant_id: string; position: number }>;
    }> = [];

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      if (group.length === 0) continue;

      const groupNumber = i + 1;
      let teeTime: string | null = null;
      let startHole: number | null = null;

      if (startType === "shotgun") {
        startHole = groupNumber;
        teeTime = `${event.event_date}T${firstTeeTime}:00`;
      } else {
        const [hours, minutes] = firstTeeTime.split(":").map(Number);
        const totalMinutes = hours * 60 + minutes + i * intervalMinutes;
        const teeHours = Math.floor(totalMinutes / 60);
        const teeMins = totalMinutes % 60;
        teeTime = `${event.event_date}T${String(teeHours).padStart(2, "0")}:${String(teeMins).padStart(2, "0")}:00`;
      }

      const { data: pairing, error: pairErr } = await supabase
        .from("pairings")
        .insert({
          event_id: eventId,
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

      const playerInserts = group.map((c, idx) => ({
        pairing_id: pairing.id,
        contestant_id: c.id,
        position: idx + 1,
      }));

      const { error: ppErr } = await supabase
        .from("pairing_players")
        .insert(playerInserts);

      if (ppErr) console.error("Pairing player insert error:", ppErr);

      createdPairings.push({
        id: pairing.id,
        group_number: groupNumber,
        tee_time: teeTime,
        start_hole: startHole,
        start_type: startType,
        players: playerInserts,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        event_id: eventId,
        start_type: startType,
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
