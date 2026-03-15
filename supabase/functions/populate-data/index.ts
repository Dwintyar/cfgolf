import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const results: Record<string, string> = {};
  const { phase } = await req.json().catch(() => ({ phase: "all" }));

  try {
    // BAGIAN A — Rename venues
    if (phase === "all" || phase === "A") {
      // Update clubs
      await supabase.from("clubs").update({
        name: "Greenfield Golf & Country Club",
        description: "Championship golf club dengan 18 hole par 72 di kawasan premium. Dikenal dengan fairway lebar dan kondisi lapangan kelas dunia."
      }).eq("id", "b0000000-0000-0000-0000-000000000001");

      await supabase.from("clubs").update({
        name: "Sunrise Valley Golf Resort",
        description: "Resort golf dengan pemandangan alam yang memukau. Championship course 18 hole dengan tantangan alam yang unik di setiap hole."
      }).eq("id", "b0000000-0000-0000-0000-000000000002");

      await supabase.from("clubs").update({
        name: "Lakeside Golf & Leisure Club",
        description: "Golf club bergaya klasik dengan danau buatan di 6 hole. Par 72, cocok untuk semua level handicap."
      }).eq("id", "b0000000-0000-0000-0000-000000000003");

      // Update courses
      await supabase.from("courses").update({
        name: "Greenfield Championship Course",
        location: "Kawasan Golf Premium, Indonesia",
        description: "Par 72 · 18 holes · 6.850 yard. Championship course dengan rough tebal dan green yang cepat.",
        green_fee_price: 950000
      }).eq("id", "c0000000-0000-0000-0000-000000000001");

      await supabase.from("courses").update({
        name: "Sunrise Valley Main Course",
        location: "Kawasan Resort Golf, Indonesia",
        description: "Par 72 · 18 holes · 6.920 yard. Dikelilingi perbukitan hijau dengan 4 hole signature bergaya links.",
        green_fee_price: 850000
      }).eq("id", "c0000000-0000-0000-0000-000000000002");

      // Update events
      await supabase.from("events").update({ name: "March Monthly - Greenfield" }).eq("id", "aa000000-0000-0000-0000-000000000001");

      // Update tour
      await supabase.from("tours").update({
        name: "CFGolf Interclub Championship 2026",
        description: "Kejuaraan interclub tahunan bergengsi CFGolf."
      }).eq("id", "d0000000-0000-0000-0000-000000000001");

      results.A = "OK - Venues renamed";
    }

    // BAGIAN B — Course Tees
    if (phase === "all" || phase === "B") {
      const tees = [
        { course_id: "c0000000-0000-0000-0000-000000000001", tee_name: "Black", color: "black", rating: 73.2, slope: 132 },
        { course_id: "c0000000-0000-0000-0000-000000000001", tee_name: "Blue", color: "blue", rating: 71.4, slope: 128 },
        { course_id: "c0000000-0000-0000-0000-000000000001", tee_name: "White", color: "white", rating: 69.8, slope: 124 },
        { course_id: "c0000000-0000-0000-0000-000000000001", tee_name: "Red", color: "red", rating: 70.1, slope: 120 },
        { course_id: "c0000000-0000-0000-0000-000000000002", tee_name: "Black", color: "black", rating: 74.1, slope: 135 },
        { course_id: "c0000000-0000-0000-0000-000000000002", tee_name: "Blue", color: "blue", rating: 72.3, slope: 130 },
        { course_id: "c0000000-0000-0000-0000-000000000002", tee_name: "White", color: "white", rating: 70.5, slope: 126 },
        { course_id: "c0000000-0000-0000-0000-000000000002", tee_name: "Red", color: "red", rating: 71.0, slope: 122 },
      ];
      const { error } = await supabase.from("course_tees").insert(tees);
      results.B = error ? `ERROR: ${error.message}` : "OK - 8 tees inserted";
    }

    // BAGIAN C — Course Holes (distance in yards, convert from meters * 1.09)
    if (phase === "all" || phase === "C") {
      // Delete existing
      await supabase.from("course_holes").delete().eq("course_id", "c0000000-0000-0000-0000-000000000001");
      await supabase.from("course_holes").delete().eq("course_id", "c0000000-0000-0000-0000-000000000002");

      const greenfield = [
        [1,4,413,7],[2,5,558,1],[3,3,180,17],[4,4,432,5],[5,4,459,3],[6,3,195,15],
        [7,5,577,11],[8,4,446,9],[9,4,399,13],[10,4,427,8],[11,5,563,2],[12,3,170,18],
        [13,4,448,4],[14,4,476,6],[15,3,208,16],[16,5,585,10],[17,4,435,12],[18,4,465,14]
      ];
      const sunrise = [
        [1,4,424,9],[2,3,188,15],[3,5,574,3],[4,4,451,5],[5,4,402,13],[6,5,593,1],
        [7,3,184,17],[8,4,440,7],[9,4,487,11],[10,4,432,10],[11,3,202,18],[12,5,566,4],
        [13,4,416,14],[14,4,468,6],[15,5,610,2],[16,3,177,16],[17,4,454,8],[18,4,479,12]
      ];

      const holes1 = greenfield.map(([n,p,d,h]) => ({ course_id: "c0000000-0000-0000-0000-000000000001", hole_number: n, par: p, distance_yards: d, handicap_index: h }));
      const holes2 = sunrise.map(([n,p,d,h]) => ({ course_id: "c0000000-0000-0000-0000-000000000002", hole_number: n, par: p, distance_yards: d, handicap_index: h }));

      const { error: e1 } = await supabase.from("course_holes").insert(holes1);
      const { error: e2 } = await supabase.from("course_holes").insert(holes2);
      results.C = (e1 || e2) ? `ERROR: ${e1?.message || e2?.message}` : "OK - 36 holes inserted";
    }

    // BAGIAN D — Buddy Connections
    if (phase === "all" || phase === "D") {
      const { data: users } = await supabase.from("profiles").select("id").order("created_at").limit(30);
      if (users && users.length >= 10) {
        const connections: any[] = [];
        for (let i = 0; i < 25; i++) {
          for (let j = i + 1; j <= Math.min(i + 5, users.length - 1); j++) {
            connections.push({
              requester_id: users[i].id,
              addressee_id: users[j].id,
              status: "accepted",
            });
          }
        }
        // Insert in batches to avoid conflicts
        let inserted = 0;
        for (const conn of connections) {
          const { error } = await supabase.from("buddy_connections").insert(conn);
          if (!error) inserted++;
        }
        results.D = `OK - ${inserted} buddy connections inserted`;
      } else {
        results.D = "SKIP - not enough profiles";
      }
    }

    // BAGIAN E — Scorecards + Hole Scores
    if (phase === "all" || phase === "E") {
      const { data: contestants } = await supabase
        .from("contestants")
        .select("id, player_id, event_id, hcp")
        .eq("event_id", "aa000000-0000-0000-0000-000000000001")
        .limit(20);

      if (contestants && contestants.length > 0) {
        // Create a round for this event
        const roundId = crypto.randomUUID();
        await supabase.from("rounds").insert({
          id: roundId,
          course_id: "c0000000-0000-0000-0000-000000000001",
          created_by: contestants[0].player_id,
          status: "completed",
          started_at: new Date(Date.now() - 4 * 3600000).toISOString(),
          finished_at: new Date(Date.now() - 1 * 3600000).toISOString(),
        });

        // Add all players to round
        const roundPlayers = contestants.map(c => ({
          round_id: roundId,
          user_id: c.player_id,
        }));
        await supabase.from("round_players").insert(roundPlayers);

        const holePars = [4,5,3,4,4,3,5,4,4,4,5,3,4,4,3,5,4,4];
        let scCount = 0;

        for (const c of contestants) {
          const scId = crypto.randomUUID();
          const hcp = c.hcp || 18;
          const baseScore = hcp <= 5 ? 0 : hcp <= 12 ? 1 : hcp <= 20 ? 2 : 3;
          
          let totalStrokes = 0;
          let totalPutts = 0;
          const holeScores: any[] = [];

          for (let h = 0; h < 18; h++) {
            const variation = Math.floor(Math.random() * 3) - 1;
            let strokes = holePars[h] + baseScore + variation;
            strokes = Math.max(strokes, holePars[h] - 1);
            strokes = Math.min(strokes, holePars[h] + 3);
            const putts = strokes <= holePars[h] ? 1 : 2;
            totalStrokes += strokes;
            totalPutts += putts;

            holeScores.push({
              scorecard_id: scId,
              hole_number: h + 1,
              strokes,
              putts,
              fairway_hit: holePars[h] >= 4 ? Math.random() > 0.4 : null,
              gir: strokes <= holePars[h],
            });
          }

          const netScore = totalStrokes - hcp;
          await supabase.from("scorecards").insert({
            id: scId,
            round_id: roundId,
            player_id: c.player_id,
            course_id: "c0000000-0000-0000-0000-000000000001",
            total_score: totalStrokes,
            gross_score: totalStrokes,
            net_score: netScore,
            total_putts: totalPutts,
          });

          await supabase.from("hole_scores").insert(holeScores);
          scCount++;
        }
        results.E = `OK - ${scCount} scorecards + ${scCount * 18} hole scores`;
      } else {
        results.E = "SKIP - no contestants found for event";
      }
    }

    // BAGIAN F — Tee Time Bookings
    if (phase === "all" || phase === "F") {
      const { data: users } = await supabase.from("profiles").select("id").limit(20);
      if (users && users.length >= 15) {
        const teeTimes = ["07:00","07:30","08:00","08:30","09:00","09:30","10:00","13:00","14:00"];
        const courses = ["c0000000-0000-0000-0000-000000000001", "c0000000-0000-0000-0000-000000000002"];
        const bookings: any[] = [];

        for (let i = 0; i < 15; i++) {
          const d = new Date();
          d.setDate(d.getDate() + (i * 2 + 1));
          const courseId = courses[i % 2];
          const players = Math.floor(Math.random() * 3) + 2;
          const price = courseId === courses[0] ? 950000 * players : 850000 * players;

          bookings.push({
            course_id: courseId,
            user_id: users[i].id,
            booking_date: d.toISOString().split("T")[0],
            tee_time: teeTimes[i % teeTimes.length],
            players_count: players,
            status: i < 5 ? "confirmed" : "pending",
            total_price: price,
          });
        }
        const { error } = await supabase.from("tee_time_bookings").insert(bookings);
        results.F = error ? `ERROR: ${error.message}` : "OK - 15 tee time bookings";
      } else {
        results.F = "SKIP - not enough profiles";
      }
    }

    // BAGIAN G — Rounds & Round Players (casual rounds)
    if (phase === "all" || phase === "G") {
      const { data: users } = await supabase.from("profiles").select("id").limit(20);
      if (users && users.length >= 12) {
        let roundCount = 0;
        for (let i = 0; i < 10; i++) {
          const rid = crypto.randomUUID();
          const daysAgo = (i + 1) * 5;
          const startDate = new Date(Date.now() - daysAgo * 86400000);

          await supabase.from("rounds").insert({
            id: rid,
            course_id: i % 2 === 0 ? "c0000000-0000-0000-0000-000000000001" : "c0000000-0000-0000-0000-000000000002",
            created_by: users[i].id,
            status: "completed",
            started_at: startDate.toISOString(),
            finished_at: new Date(startDate.getTime() + 4 * 3600000).toISOString(),
          });

          const playerCount = Math.floor(Math.random() * 2) + 2;
          const rps: any[] = [];
          for (let j = i; j < Math.min(i + playerCount, users.length); j++) {
            rps.push({ round_id: rid, user_id: users[j].id });
          }
          await supabase.from("round_players").insert(rps);
          roundCount++;
        }
        results.G = `OK - ${roundCount} casual rounds created`;
      } else {
        results.G = "SKIP - not enough profiles";
      }
    }

    // BAGIAN H — Conversations + Messages
    if (phase === "all" || phase === "H") {
      const { data: users } = await supabase.from("profiles").select("id").limit(10);
      const msgTemplates = [
        "Gimana kondisi lapangan hari ini bro?",
        "Mantap! Sabtu depan main bareng yuk",
        "HCP gue turun 2 poin kemarin hehe",
        "Wah bagus! Di mana nih kemarin main?",
        "Di Greenfield, kondisinya bagus banget greens-nya cepet",
        "Oke fix Sabtu jam 7 pagi ya, siapin driver lu yang baru",
        "Gas! Jangan lupa booking dulu biar dapet slot pagi",
        "Udah gue booking tadi, Group 1 jam 07.00",
        "Top! Ajak si Budi juga dong, lama gak main bareng",
        "Budi lagi di luar kota, tapi minggu depan balik katanya",
        "Oke nanti gue hubungin dia. See you Sabtu!",
      ];

      if (users && users.length >= 6) {
        let convCount = 0;
        for (let i = 0; i < 5; i++) {
          const convId = crypto.randomUUID();
          const daysAgo = (i + 1) * 3;
          const baseTime = new Date(Date.now() - daysAgo * 86400000);

          await supabase.from("conversations").insert({
            id: convId,
            created_at: baseTime.toISOString(),
            updated_at: new Date(baseTime.getTime() + 3600000).toISOString(),
          });

          await supabase.from("conversation_participants").insert([
            { conversation_id: convId, user_id: users[i].id },
            { conversation_id: convId, user_id: users[i + 1].id },
          ]);

          const msgCount = Math.floor(Math.random() * 3) + 4;
          const msgs: any[] = [];
          for (let m = 0; m < msgCount; m++) {
            msgs.push({
              conversation_id: convId,
              sender_id: m % 2 === 0 ? users[i].id : users[i + 1].id,
              content: msgTemplates[(i + m) % msgTemplates.length],
              created_at: new Date(baseTime.getTime() + m * 15 * 60000).toISOString(),
            });
          }
          await supabase.from("chat_messages").insert(msgs);
          convCount++;
        }
        results.H = `OK - ${convCount} conversations with messages`;
      } else {
        results.H = "SKIP - not enough profiles";
      }
    }

    // BAGIAN I — Club Invitations
    if (phase === "all" || phase === "I") {
      const { data: clubs } = await supabase.from("clubs").select("id, owner_id").eq("is_personal", false).limit(5);
      const { data: nonMembers } = await supabase.from("profiles").select("id").limit(100);
      
      if (clubs && clubs.length > 0 && nonMembers && nonMembers.length >= 10) {
        const invitations: any[] = [];
        for (let i = 0; i < Math.min(8, nonMembers.length); i++) {
          const club = clubs[i % clubs.length];
          invitations.push({
            club_id: club.id,
            invited_by: club.owner_id,
            invited_user_id: nonMembers[nonMembers.length - 1 - i].id,
            status: i < 3 ? "pending" : i < 6 ? "accepted" : "declined",
          });
        }
        const { error } = await supabase.from("club_invitations").insert(invitations);
        results.I = error ? `ERROR: ${error.message}` : "OK - 8 club invitations";
      } else {
        results.I = "SKIP - not enough data";
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err), results }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
