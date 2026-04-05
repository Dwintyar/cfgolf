import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEMO_CLUB_ID   = "d3d00000-0000-0000-0000-000000000001";
const DEMO_COURSE_ID = "f1db9c9e-c4ad-4759-a748-c93a959b4391"; // Jagorawi

const pastDateStr  = (daysAgo: number)  => { const d = new Date(); d.setDate(d.getDate() - daysAgo); return d.toISOString().split("T")[0]; };
const futureDateStr = (daysAhead: number) => { const d = new Date(); d.setDate(d.getDate() + daysAhead); return d.toISOString().split("T")[0]; };
const isoTs = (daysAgo: number, hour = 7) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(hour, 0, 0, 0); return d.toISOString(); };

// Realistic 90-gross scorecard at Jagorawi (par 72, HCP 18, Nett 72)
// Format: [hole, par, strokes, putts, fairway_hit, gir]
const DEMO_HOLES: [number, number, number, number, boolean | null, boolean][] = [
  [1,  4, 5, 2, true,  false],
  [2,  5, 6, 2, true,  false],
  [3,  4, 5, 2, false, false],
  [4,  3, 4, 2, null,  false],
  [5,  4, 6, 2, false, false],
  [6,  4, 5, 2, true,  false],
  [7,  3, 4, 2, null,  false],
  [8,  5, 6, 2, true,  true ],
  [9,  4, 5, 2, true,  false],
  [10, 4, 5, 2, true,  false],
  [11, 3, 3, 1, null,  true ],
  [12, 5, 7, 3, false, false],
  [13, 4, 5, 2, true,  false],
  [14, 4, 5, 2, true,  false],
  [15, 3, 4, 2, null,  false],
  [16, 5, 6, 2, true,  true ],
  [17, 4, 4, 1, true,  true ],
  [18, 4, 5, 2, true,  false],
];
// Total: gross 90, putts 35, nett 72

export const useDemoInstall = (userId: string | null) => {
  const [loading, setLoading] = useState(false);

  const installDemo = async (): Promise<boolean> => {
    if (!userId) return false;
    setLoading(true);
    try {
      // ── 1. Member di Demo Club ───────────────────────────────
      const { error: memberErr } = await supabase.from("members").insert({
        user_id: userId, club_id: DEMO_CLUB_ID,
        role: "member", joined_at: new Date().toISOString(), is_demo: true,
      });
      if (memberErr && memberErr.code !== "23505") throw memberErr;

      // ── 2. Booking PENDING (3 hari ke depan) ────────────────
      const { error: b1Err } = await supabase.from("tee_time_bookings").insert({
        user_id: userId, course_id: DEMO_COURSE_ID,
        booking_date: futureDateStr(3), tee_time: "08:00",
        players_count: 2, total_price: 700000,
        notes: "Demo: coba konfirmasi dari sisi venue ⛳",
        status: "pending", is_demo: true,
      });
      if (b1Err) throw b1Err;

      // ── 3. Booking CONFIRMED (7 hari ke depan) ───────────────
      const { error: b2Err } = await supabase.from("tee_time_bookings").insert({
        user_id: userId, course_id: DEMO_COURSE_ID,
        booking_date: futureDateStr(7), tee_time: "07:30",
        players_count: 4, total_price: 1400000,
        notes: "Demo: booking sudah dikonfirmasi venue",
        status: "confirmed", is_demo: true,
      });
      if (b2Err) throw b2Err;

      // ── 4. Round selesai (5 hari lalu) ───────────────────────
      const startedAt  = isoTs(5, 7);
      const finishedAt = isoTs(5, 12);

      const { data: roundData, error: roundErr } = await supabase
        .from("rounds")
        .insert({
          course_id: DEMO_COURSE_ID, created_by: userId,
          started_at: startedAt, finished_at: finishedAt,
          status: "finished", is_demo: true,
        })
        .select("id")
        .single();
      if (roundErr) throw roundErr;

      // ── 5. Scorecard ─────────────────────────────────────────
      const { data: scData, error: scErr } = await supabase
        .from("scorecards")
        .insert({
          player_id: userId, round_id: roundData.id,
          course_id: DEMO_COURSE_ID,
          gross_score: 90, net_score: 72,
          total_putts: 35, total_score: 90,
          is_demo: true,
        })
        .select("id")
        .single();
      if (scErr) throw scErr;

      // ── 6. 18 hole scores ────────────────────────────────────
      const holeInserts = DEMO_HOLES.map(([hole, , strokes, putts, fw, gir]) => ({
        scorecard_id: scData.id,
        hole_number: hole,
        strokes,
        putts,
        fairway_hit: fw,
        gir,
        is_demo: true,
      }));
      const { error: hsErr } = await supabase.from("hole_scores").insert(holeInserts);
      if (hsErr) throw hsErr;

      // ── 7. Aktifkan demo_mode ────────────────────────────────
      const { error: profileErr } = await supabase
        .from("profiles").update({ demo_mode: true }).eq("id", userId);
      if (profileErr) throw profileErr;

      return true;
    } catch (e) {
      console.error("Demo install error:", e);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const uninstallDemo = async (): Promise<boolean> => {
    if (!userId) return false;
    setLoading(true);
    try {
      // Hapus hole_scores (via scorecard cascade)
      const { data: demoCc } = await supabase
        .from("scorecards")
        .select("id")
        .eq("player_id", userId)
        .eq("is_demo", true);
      if (demoCc && demoCc.length > 0) {
        const ids = demoCc.map(s => s.id);
        await supabase.from("hole_scores").delete().in("scorecard_id", ids);
        await supabase.from("scorecards").delete().in("id", ids);
      }

      // Hapus rounds
      await supabase.from("rounds")
        .delete().eq("created_by", userId).eq("is_demo", true);

      // Hapus tee_time_bookings
      await supabase.from("tee_time_bookings")
        .delete().eq("user_id", userId).eq("is_demo", true);

      // Hapus members
      await supabase.from("members")
        .delete().eq("user_id", userId).eq("is_demo", true);

      // Matikan demo_mode
      const { error } = await supabase
        .from("profiles").update({ demo_mode: false }).eq("id", userId);
      if (error) throw error;

      return true;
    } catch (e) {
      console.error("Demo uninstall error:", e);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { installDemo, uninstallDemo, loading };
};
