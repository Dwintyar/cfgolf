import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// IDs yang tetap untuk demo data
const DEMO_CLUB_ID   = "d3d00000-0000-0000-0000-000000000001";
// Jagorawi — venue EGT yang sudah ada di DB
const DEMO_COURSE_ID = "f1db9c9e-c4ad-4759-a748-c93a959b4391";

// Buat date helper
const futureDateStr = (daysAhead: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split("T")[0];
};

export const useDemoInstall = (userId: string | null) => {
  const [loading, setLoading] = useState(false);

  const installDemo = async (): Promise<boolean> => {
    if (!userId) return false;
    setLoading(true);
    try {
      // 1. Tambah user ke demo club sebagai member
      const { error: memberErr } = await supabase.from("members").insert({
        user_id: userId,
        club_id: DEMO_CLUB_ID,
        role: "member",
        joined_at: new Date().toISOString(),
        is_demo: true,
      });
      if (memberErr && memberErr.code !== "23505") throw memberErr;

      // 2. Buat demo tee time booking (3 hari ke depan)
      const { error: bookingErr } = await supabase.from("tee_time_bookings").insert({
        user_id: userId,
        course_id: DEMO_COURSE_ID,
        booking_date: futureDateStr(3),
        tee_time: "08:00",
        players_count: 2,
        total_price: 700000,
        notes: "Demo booking — coba konfirmasi dari sisi venue",
        status: "pending",
        is_demo: true,
      });
      if (bookingErr) throw bookingErr;

      // 3. Aktifkan demo_mode di profil user
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ demo_mode: true })
        .eq("id", userId);
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
      // Hapus demo members
      await supabase.from("members")
        .delete()
        .eq("user_id", userId)
        .eq("is_demo", true);

      // Hapus demo tee_time_bookings
      await supabase.from("tee_time_bookings")
        .delete()
        .eq("user_id", userId)
        .eq("is_demo", true);

      // Hapus demo scorecards (cascade ke hole_scores)
      await supabase.from("scorecards")
        .delete()
        .eq("player_id", userId)
        .eq("is_demo", true);

      // Matikan demo_mode
      const { error } = await supabase
        .from("profiles")
        .update({ demo_mode: false })
        .eq("id", userId);
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
