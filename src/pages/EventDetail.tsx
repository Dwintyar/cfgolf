import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar, MapPin, Users, Ticket, Trophy, Award, Shuffle, TrendingDown,
  ClipboardCheck, Package, Lock, Car, UserCheck, ChevronRight, Pencil, Plus, RefreshCw, Clock, Download, Flag, Backpack, User, Monitor, Share2, MessageCircle
} from "lucide-react";
import html2canvas from "html2canvas";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import AssignContestantDialog from "@/components/tour/AssignContestantDialog";
import WinnerResultsDialog from "@/components/event/WinnerResultsDialog";
import EventCheckin from "@/components/event/EventCheckin";

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAssign, setShowAssign] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [startType, setStartType] = useState("tee_time");
  const [firstTee, setFirstTee] = useState("07:00");
  const [interval, setInterval] = useState("8");
  const [activeTab, setActiveTab] = useState("overview");
  const [userId, setUserId] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [showCheckinDialog, setShowCheckinDialog] = useState(false);
  const [showCartDialog, setShowCartDialog] = useState(false);
  const [showCaddyDialog, setShowCaddyDialog] = useState(false);
  const [cartNumber, setCartNumber] = useState("");
  const [selectedContestantForCart, setSelectedContestantForCart] = useState("");
  const [selectedContestantForCaddy, setSelectedContestantForCaddy] = useState("");
  const [selectedCaddy, setSelectedCaddy] = useState("");
  const [showWinners, setShowWinners] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pairingsList, setPairingsList] = useState<any[]>([]);
  const [hcpRows, setHcpRows] = useState<any[]>([]);
  const [hcpLoading, setHcpLoading] = useState(true);
  const [selectedScoreboardPlayer, setSelectedScoreboardPlayer] = useState<any>(null);
  const [playerHoleScores, setPlayerHoleScores] = useState<Record<number, number>>({});
  const [playerHoleLoading, setPlayerHoleLoading] = useState(false);
  const hcpExportRef = useRef<HTMLDivElement>(null);
  const [playersByPairing, setPlayersByPairing] = useState<Record<string, any[]>>({});
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false
  );

  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // HCP Correction data loading
  useEffect(() => {
    const loadHcp = async () => {
      if (activeTab !== "hcpcorr" || !id) return;
      setHcpLoading(true);
      const { data: hcpData } = await supabase
        .from("handicap_history")
        .select("player_id, old_hcp, new_hcp, gross_score, net_score, sandbagging_flag, tour_id")
        .eq("event_id", id)
        .order("new_hcp", { ascending: true });

      if (!hcpData?.length) { setHcpRows([]); setHcpLoading(false); return; }

      const pIds = hcpData.map(h => h.player_id);

      // Get tour_id from the event itself (not from handicap_history)
      const { data: eventData } = await supabase
        .from("events")
        .select("tour_id")
        .eq("id", id)
        .single();
      const tourId = eventData?.tour_id;

      const [{ data: profs }, { data: tourPlayerClubs }, { data: flightsData }] = await Promise.all([
        supabase.from("profiles").select("id, full_name").in("id", pIds),
        tourId
          ? supabase.from("tour_players").select("player_id, clubs!inner(name)").eq("tour_id", tourId).in("player_id", pIds)
          : Promise.resolve({ data: [] as any[] }),
        tourId
          ? supabase.from("tournament_flights").select("flight_name, hcp_min, hcp_max").eq("tour_id", tourId).order("hcp_min", { ascending: true })
          : Promise.resolve({ data: [] as any[] }),
      ]);


      const profMap: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { profMap[p.id] = p.full_name; });
      const clubMap: Record<string, string> = {};
      (tourPlayerClubs ?? []).forEach((tp: any) => { if (tp.player_id) clubMap[tp.player_id] = (tp.clubs as any)?.name ?? "—"; });

      const getFlightName = (hcp: number | null) => {
        if (hcp == null || !flightsData?.length) return "?";
        const fl = (flightsData as any[]).find((f: any) => hcp >= f.hcp_min && hcp <= f.hcp_max);
        if (!fl) return "?";
        const name = fl.flight_name ?? "";
        const match = name.match(/[ABC]$/);
        return match ? match[0] : name;
      };

      setHcpRows(hcpData.map((h: any, i: number) => ({
        no: i + 1,
        player_id: h.player_id,
        name: profMap[h.player_id] ?? "Unknown",
        club: clubMap[h.player_id] ?? "—",
        old_hcp: h.old_hcp,
        new_hcp: h.new_hcp,
        delta: (h.old_hcp ?? 0) - (h.new_hcp ?? 0),
        old_flight: getFlightName(h.old_hcp),
        new_flight: getFlightName(h.new_hcp),
        moved: getFlightName(h.old_hcp) !== getFlightName(h.new_hcp),
      })));
      setHcpLoading(false);
    };
    loadHcp();
  }, [activeTab, id]);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const content = document.createElement("div");
      content.style.cssText = `width:800px;padding:40px;background:white;font-family:sans-serif;color:#1a1a1a;`;
      content.innerHTML = `
        <div style="text-align:center;margin-bottom:24px;border-bottom:2px solid #1a6b3c;padding-bottom:16px">
          <h1 style="font-size:24px;font-weight:700;color:#1a6b3c;margin:0">${event?.name}</h1>
          <p style="color:#666;margin:4px 0">${event?.event_date} · ${(event?.courses as any)?.name}</p>
          <p style="color:#666;margin:0;font-size:13px">${(event?.tours as any)?.name ?? ""}</p>
        </div>
        <h2 style="font-size:16px;color:#1a6b3c;margin-bottom:12px">Leaderboard</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px">
          <thead><tr style="background:#1a6b3c;color:white">
            <th style="padding:8px 12px;text-align:left">Rank</th>
            <th style="padding:8px 12px;text-align:left">Nama</th>
            <th style="padding:8px 12px;text-align:center">HCP</th>
            <th style="padding:8px 12px;text-align:center">Gross</th>
            <th style="padding:8px 12px;text-align:center">Net</th>
          </tr></thead>
          <tbody>
            ${(leaderboard ?? []).slice(0, 20).map((row: any, i: number) => `
              <tr style="background:${i % 2 === 0 ? '#f9f9f9' : 'white'}">
                <td style="padding:6px 12px;font-weight:${row.rank_net <= 3 ? '700' : '400'}">
                  ${row.rank_net <= 3 ? ['🥇','🥈','🥉'][row.rank_net-1] : row.rank_net}
                </td>
                <td style="padding:6px 12px">${row.profiles?.full_name ?? "Unknown"}</td>
                <td style="padding:6px 12px;text-align:center">${row.hcp ?? '-'}</td>
                <td style="padding:6px 12px;text-align:center">${row.total_gross ?? '-'}</td>
                <td style="padding:6px 12px;text-align:center;font-weight:600;color:#1a6b3c">${row.total_net ?? '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p style="font-size:11px;color:#999;text-align:center;border-top:1px solid #eee;padding-top:12px;margin-top:24px">
          Generated by GolfBuana · ${new Date().toLocaleDateString('id-ID')}
        </p>
      `;
      document.body.appendChild(content);
      const canvas = await html2canvas(content, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      document.body.removeChild(content);
      const link = document.createElement("a");
      link.download = `${event?.name}-results.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Export berhasil!");
    } catch (err: any) {
      toast.error("Export gagal: " + err.message);
    }
    setExporting(false);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // --- Queries ---
  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, courses(name, location, par, id), tours(name, id, organizer_club_id)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: contestants, refetch: refetchContestants } = useQuery({
    queryKey: ["event-contestants", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contestants")
        .select("*, profiles(full_name, avatar_url, handicap), tournament_flights(flight_name)")
        .eq("event_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: tickets } = useQuery({
    queryKey: ["event-tickets", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*, clubs(name), profiles(full_name)")
        .eq("event_id", id!)
        .order("ticket_number");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: checkins, refetch: refetchCheckins } = useQuery({
    queryKey: ["event-checkins", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_checkins")
        .select("*, contestants(profiles(full_name))")
        .eq("event_id", id!)
        .order("checked_in_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: cartAssignments, refetch: refetchCarts } = useQuery({
    queryKey: ["event-carts", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("golf_cart_assignments")
        .select("*, contestants(profiles(full_name))")
        .eq("event_id", id!)
        .order("cart_number");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: caddyAssignments, refetch: refetchCaddies } = useQuery({
    queryKey: ["event-caddies", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caddy_assignments")
        .select("*, contestants(profiles(full_name)), course_caddies(name, caddy_number)")
        .eq("event_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const refetchPairings = async () => { /* trigger useEffect reload */ setPairingsList([]); setPlayersByPairing({}); setTimeout(() => loadPairingsData(), 100); };

  const { data: leaderboard, refetch: refetchLeaderboard } = useQuery({
    queryKey: ["event-leaderboard", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_leaderboard")
        .select("*, profiles:player_id(full_name)")
        .eq("event_id", id!)
        .order("rank_net", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: results, refetch: refetchResults } = useQuery({
    queryKey: ["event-results", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_results")
        .select("*, contestants(profiles(full_name)), tournament_winner_categories(category_name, calculation_type)")
        .eq("event_id", id!)
        .order("rank_position");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: courseHoles } = useQuery({
    queryKey: ["event-course-holes", event?.courses],
    queryFn: async () => {
      const courseId = (event?.courses as any)?.id;
      if (!courseId) return [];
      const { data } = await supabase
        .from("course_holes")
        .select("hole_number, par")
        .eq("course_id", courseId)
        .order("hole_number");
      return data ?? [];
    },
    enabled: !!event,
  });

  // Scoreboard data: scorecards with hole scores, grouped by flight
  const { data: scoreboardData, refetch: refetchScoreboard } = useQuery({
    queryKey: ["event-scoreboard", id],
    queryFn: async () => {
      if (!id) return [];

      // Get event info
      const { data: eventInfo } = await supabase
        .from("events")
        .select("course_id, event_date, tour_id")
        .eq("id", id)
        .single();
      if (!eventInfo?.course_id) return [];

      // Get contestants
      const { data: eventContestants } = await supabase
        .from("contestants")
        .select(`
          id, player_id, hcp, flight_id,
          profiles ( full_name ),
          tournament_flights ( flight_name, hcp_min, hcp_max, display_order )
        `)
        .eq("event_id", id);
      if (!eventContestants?.length) return [];

      const playerIds = eventContestants.map(c => c.player_id);

      // Lookup round via event_rounds (authoritative, supports multi-round tournaments)
      const { data: eventRounds } = await supabase
        .from("event_rounds")
        .select("round_id, round_number")
        .eq("event_id", id)
        .order("round_number", { ascending: true });

      // Fallback: jika event_rounds belum ada, cari via course + date (legacy)
      let roundIds: string[] = (eventRounds ?? []).map((er: any) => er.round_id);
      if (roundIds.length === 0) {
        const eventDate = eventInfo.event_date?.slice(0, 10);
        const { data: roundRows } = await supabase
          .from("rounds")
          .select("id, created_at")
          .eq("course_id", eventInfo.course_id)
          .order("created_at", { ascending: false });
        const matched = roundRows?.find(r => r.created_at?.slice(0, 10) === eventDate) ?? roundRows?.[0];
        if (matched) roundIds = [matched.id];
      }

      if (roundIds.length === 0) {
        return eventContestants.map(ct => ({
          player_id: ct.player_id,
          full_name: (ct.profiles as any)?.full_name ?? "Unknown",
          club_name: "—", out_score: null, in_score: null, tot: null, nett: null,
          hcp: ct.hcp, flight_id: ct.flight_id,
          flight_name: (ct.tournament_flights as any)?.flight_name ?? "",
          hcp_min: (ct.tournament_flights as any)?.hcp_min ?? 0,
          hcp_max: (ct.tournament_flights as any)?.hcp_max ?? 36,
          display_order: (ct.tournament_flights as any)?.display_order ?? 0,
          contestant_id: ct.id, category_name: "",
        }));
      }

      // Fetch scorecards dari semua round yang terdaftar di event_rounds
      const { data: scorecards } = await supabase
        .from("scorecards")
        .select("id, player_id, gross_score, net_score")
        .in("round_id", roundIds)
        .in("player_id", playerIds)
        .limit(1000);


      // Fetch hole_scores in chunks of scorecard IDs to avoid large .in() issues
      const scIds = (scorecards ?? []).map(s => s.id);
      let allHoles: any[] = [];
      const chunkSize = 50;

      for (let i = 0; i < scIds.length; i += chunkSize) {
        const chunk = scIds.slice(i, i + chunkSize);
        const pageSize = 1000;
        let page = 0;
        let keepFetching = true;

        while (keepFetching) {
          const from = page * pageSize;
          const to = from + pageSize - 1;

          const { data: batch } = await supabase
            .from("hole_scores")
            .select("scorecard_id, hole_number, strokes")
            .in("scorecard_id", chunk)
            .range(from, to);

          if (batch && batch.length > 0) {
            allHoles = [...allHoles, ...batch];
            page += 1;
            if (batch.length < pageSize) keepFetching = false;
          } else {
            keepFetching = false;
          }
        }
      }


      // Compute OUT/IN per scorecard
      const outInMap: Record<string, { out: number; in: number }> = {};
      allHoles.forEach((h: any) => {
        if (!outInMap[h.scorecard_id]) outInMap[h.scorecard_id] = { out: 0, in: 0 };
        if (h.hole_number >= 1 && h.hole_number <= 9) outInMap[h.scorecard_id].out += (h.strokes ?? 0);
        else if (h.hole_number >= 10 && h.hole_number <= 18) outInMap[h.scorecard_id].in += (h.strokes ?? 0);
      });

      // Build scoreByPlayer (dedupe: keep first match per player)
      const scoreByPlayer: Record<string, { out: number | null; in: number | null; tot: number | null; net: number | null }> = {};
      (scorecards ?? []).forEach((sc: any) => {
        if (scoreByPlayer[sc.player_id]) return;
        const oi = outInMap[sc.id];
        // If hole_scores exist: compute OUT/IN/TOT from them
        // If no hole_scores but gross_score exists: show TOT & NET only
        const hasHoles = !!oi;
        const computedTot = hasHoles ? (oi.out + oi.in) : (sc.gross_score ?? null);
        scoreByPlayer[sc.player_id] = {
          out: hasHoles ? oi.out : null,
          in: hasHoles ? oi.in : null,
          tot: computedTot,
          net: sc.net_score ?? null,
        };
      });

      // Get event results for remarks
      const { data: eventResults } = await supabase
        .from("event_results")
        .select(`contestant_id, tournament_winner_categories ( category_name )`)
        .eq("event_id", id);

      const resultsMap: Record<string, string> = {};
      (eventResults ?? []).forEach((er: any) => {
        resultsMap[er.contestant_id] = (er.tournament_winner_categories as any)?.category_name ?? "";
      });

      // Get club names via tour_players — left join agar player tanpa club_id tetap muncul
      const { data: tourPlayerClubs } = eventInfo.tour_id
        ? await supabase
            .from("tour_players")
            .select("player_id, clubs(name)")
            .eq("tour_id", eventInfo.tour_id)
            .in("player_id", playerIds)
        : { data: [] as any[] };

      // Fallback: cari club via tickets table untuk player yang club_id-nya null
      const { data: ticketClubs } = await supabase
        .from("tickets")
        .select("assigned_player_id, clubs(name)")
        .eq("event_id", id)
        .in("assigned_player_id", playerIds);

      // Fallback 2: cari club via members table
      const { data: memberClubs } = await supabase
        .from("members")
        .select("user_id, clubs(name)")
        .in("user_id", playerIds);

      const clubMap: Record<string, string> = {};
      // members sebagai base (paling umum)
      (memberClubs ?? []).forEach((m: any) => {
        if (m.user_id && (m.clubs as any)?.name) {
          clubMap[m.user_id] = (m.clubs as any).name;
        }
      });
      // tickets override members (lebih spesifik per event)
      (ticketClubs ?? []).forEach((t: any) => {
        if (t.assigned_player_id && (t.clubs as any)?.name) {
          clubMap[t.assigned_player_id] = (t.clubs as any).name;
        }
      });
      // tour_players override jika ada
      (tourPlayerClubs ?? []).forEach((tp: any) => {
        if (tp.player_id && (tp.clubs as any)?.name) {
          clubMap[tp.player_id] = (tp.clubs as any).name;
        }
      });

      // Build rows
      const rows = eventContestants.map(ct => {
        const scores = scoreByPlayer[ct.player_id];
        return {
          player_id: ct.player_id,
          full_name: (ct.profiles as any)?.full_name ?? "Unknown",
          club_name: clubMap[ct.player_id] ?? "—",
          out_score: scores?.out ?? null,
          in_score: scores?.in ?? null,
          tot: scores?.tot ?? null,
          nett: scores?.net ?? null,
          hcp: ct.hcp, flight_id: ct.flight_id,
          flight_name: (ct.tournament_flights as any)?.flight_name ?? "",
          hcp_min: (ct.tournament_flights as any)?.hcp_min ?? 0,
          hcp_max: (ct.tournament_flights as any)?.hcp_max ?? 36,
          display_order: (ct.tournament_flights as any)?.display_order ?? 0,
          contestant_id: ct.id,
          category_name: resultsMap[ct.id] ?? "",
        };
      });

      rows.sort((a, b) => {
        if (a.display_order !== b.display_order) return a.display_order - b.display_order;
        if (a.nett == null && b.nett == null) return 0;
        if (a.nett == null) return 1;
        if (b.nett == null) return -1;
        return a.nett - b.nett;
      });

      return rows;
    },
    enabled: !!id,
  });

  const scoreboardRef = useRef<HTMLDivElement>(null);

  // Pairings: flat queries joined in JS via useEffect
  const loadPairingsData = async () => {
    if (!id) return;
    const eventId = id;

    // Step 1
    const { data: p, error: pe } = await supabase
      .from("pairings")
      .select("id, pairing_label, start_hole, slot, tee_time")
      .eq("event_id", eventId)
      .order("start_hole")
      .order("slot");
    if (!p?.length) return;

    // Step 2
    const { data: pp, error: ppe } = await supabase
      .from("pairing_players")
      .select("pairing_id, contestant_id, position")
      .in("pairing_id", p.map(x => x.id));
    if (!pp?.length) { setPairingsList(p); return; }

    // Step 3
    const { data: ct, error: cte } = await supabase
      .from("contestants")
      .select("id, player_id, hcp, flight_id")
      .in("id", pp.map(x => x.contestant_id).filter(Boolean));

    // Step 4
    const { data: pr, error: pre } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", (ct ?? []).map(x => x.player_id));

    // Step 5
    const flIds = [...new Set((ct ?? []).map(c => c.flight_id).filter(Boolean))] as string[];
    const { data: fl } = flIds.length
      ? await supabase.from("tournament_flights").select("id, flight_name").in("id", flIds)
      : { data: [] as any[] };

    // Step 6
    const { data: ca } = await supabase
      .from("golf_cart_assignments")
      .select("contestant_id, cart_number")
      .eq("event_id", eventId);

    // Step 7
    const { data: ec } = await supabase
      .from("event_checkins")
      .select("contestant_id, bag_drop_number")
      .eq("event_id", eventId);

    // Step 8
    const { data: cdy } = await supabase
      .from("caddy_assignments")
      .select("contestant_id, course_caddy_id, course_caddies(name)")
      .eq("event_id", eventId);

    // Maps
    const ctMap = Object.fromEntries((ct ?? []).map(c => [c.id, c]));
    const prMap = Object.fromEntries((pr ?? []).map(x => [x.id, x]));
    const flMap = Object.fromEntries((fl ?? []).map(x => [x.id, x]));
    const caMap = Object.fromEntries((ca ?? []).map(x => [x.contestant_id, x.cart_number]));
    const ecMap = Object.fromEntries((ec ?? []).map(x => [x.contestant_id, x.bag_drop_number]));
    const cdyMap = Object.fromEntries((cdy ?? []).map(x => [
      x.contestant_id, (x.course_caddies as any)?.name ?? "—"
    ]));

    // Group players by pairing
    const byPairing: Record<string, any[]> = {};
    (pp ?? []).forEach(row => {
      if (!byPairing[row.pairing_id]) byPairing[row.pairing_id] = [];
      const c = ctMap[row.contestant_id!];
      const prof = c ? prMap[c.player_id] : null;
      const f = c ? flMap[c.flight_id!] : null;
      byPairing[row.pairing_id].push({
        id: row.contestant_id,
        position: row.position,
        full_name: prof?.full_name ?? "?",
        avatar_url: prof?.avatar_url,
        player_id: c?.player_id ?? null,
        hcp: c?.hcp ?? null,
        flight_name: f?.flight_name?.replace("Flight Level ", "") ?? "?",
        cart_number: caMap[row.contestant_id!] ?? null,
        bag_number: ecMap[row.contestant_id!] ?? null,
        caddy_name: cdyMap[row.contestant_id!] ?? null,
      });
    });

    setPairingsList(p);
    setPlayersByPairing(byPairing);
  };

  useEffect(() => {
    loadPairingsData();
  }, [id]);

  // Fetch per-hole scores when a player is selected from the Board tab
  useEffect(() => {
    if (!selectedScoreboardPlayer) { setPlayerHoleScores({}); return; }
    const fetchHoles = async () => {
      setPlayerHoleLoading(true);
      try {
        const { data: eventInfo } = await supabase
          .from("events")
          .select("course_id, event_date")
          .eq("id", id!)
          .single();
        if (!eventInfo) { setPlayerHoleScores({}); setPlayerHoleLoading(false); return; }
        const eventDate = eventInfo.event_date?.slice(0, 10);
        const { data: roundRows } = await supabase
          .from("rounds")
          .select("id, created_at")
          .eq("course_id", eventInfo.course_id)
          .order("created_at", { ascending: false });
        const matchedRound = roundRows?.find(r => r.created_at?.slice(0, 10) === eventDate) ?? roundRows?.[0];
        if (!matchedRound) { setPlayerHoleScores({}); setPlayerHoleLoading(false); return; }
        const { data: sc } = await supabase
          .from("scorecards")
          .select("id")
          .eq("round_id", matchedRound.id)
          .eq("player_id", selectedScoreboardPlayer.player_id)
          .maybeSingle();
        if (!sc) { setPlayerHoleScores({}); setPlayerHoleLoading(false); return; }
        const { data: holes } = await supabase
          .from("hole_scores")
          .select("hole_number, strokes")
          .eq("scorecard_id", sc.id)
          .order("hole_number");
        const map: Record<number, number> = {};
        (holes ?? []).forEach(h => { map[h.hole_number] = h.strokes; });
        setPlayerHoleScores(map);
      } finally {
        setPlayerHoleLoading(false);
      }
    };
    fetchHoles();
  }, [selectedScoreboardPlayer, id]);

  // Check if user is contestant & checked in
  const myContestant = contestants?.find(c => c.player_id === userId);
  const myCheckin = checkins?.find(ci => ci.contestant_id === myContestant?.id);
  const isCheckedIn = !!myCheckin;

  // Find my pairing group
  const myPairing = pairingsList.find(p =>
    (playersByPairing[p.id] ?? []).some((pl: any) => pl.player_id === userId)
  );
  const myGroupPlayers = myPairing ? (playersByPairing[myPairing.id] ?? []) : [];

  // Check if user is club admin for the event's organizing club
  const { data: isEventAdmin } = useQuery({
    queryKey: ["event-admin-check", id, userId],
    queryFn: async () => {
      const clubId = (event?.tours as any)?.organizer_club_id;
      if (!clubId || !userId) return false;
      // 1. Check club admin (owner/admin)
      const { data: memberRole } = await supabase
        .from("members")
        .select("role")
        .eq("club_id", clubId)
        .eq("user_id", userId)
        .in("role", ["owner", "admin"])
        .maybeSingle();
      if (memberRole) return true;
      // 2. Check event role (tournament_director or event_coordinator)
      const { data: eventRole } = await supabase
        .from("event_roles")
        .select("role")
        .eq("event_id", id!)
        .eq("user_id", userId)
        .in("role", ["tournament_director", "event_coordinator"])
        .maybeSingle();
      if (eventRole) return true;
      // 3. Fallback: platform super admin
      const { data: sysAdmin } = await supabase
        .from("system_admins")
        .select("id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();
      return !!sysAdmin;
    },
    enabled: !!event && !!userId,
  });


  const showAdminActions = !!isEventAdmin;

  // --- Handlers ---
  const invokeWithAuth = async (fnName: string, body: any) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    return supabase.functions.invoke(fnName, {
      body,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  };

  const handleGeneratePairings = async () => {
    if (!id) return;
    setGenerating(true);
    try {
      const { data, error } = await invokeWithAuth("generate-event-pairings", {
        event_id: id, start_type: startType, first_tee_time: firstTee, interval_minutes: parseInt(interval) || 8,
      });
      if (error) toast.error(error.message || "Failed");
      else if (data?.error) toast.error(data.error);
      else { toast.success(`Generated ${data.groups_created} groups`); refetchPairings(); }
    } catch (err: any) { toast.error(err.message); }
    finally { setGenerating(false); }
  };

  const handleFinalizeEvent = async () => {
    if (!id) return;
    setFinalizing(true);
    setShowFinalizeConfirm(false);
    try {
      // Step 1: Hitung pemenang
      const { data: winnersData, error: winnersErr } =
        await invokeWithAuth("calculate-event-winners", { event_id: id });
      if (winnersErr) {
        toast.error(
          "Edge function tidak tersedia. Event akan di-set completed tanpa kalkulasi pemenang."
        );
        // Tetap lanjut ke step 3
      } else if (winnersData?.error) {
        toast.error("Gagal menghitung pemenang: " + winnersData.error);
        setFinalizing(false);
        return;
      }

      // Step 2: Update tournament HCP (hanya jika step 1 berhasil)
      if (!winnersErr) {
        const { error: hcpErr } = await invokeWithAuth(
          "update-player-handicap",
          { event_id: id }
        );
        if (hcpErr) {
          toast.error("HCP update gagal: " + hcpErr.message);
        }
      }

      // Step 3: Set event completed (selalu dijalankan)
      const { error: statusErr } = await supabase
        .from("events")
        .update({ status: "completed" })
        .eq("id", id);
      if (statusErr) {
        toast.error("Gagal update status: " + statusErr.message);
        setFinalizing(false);
        return;
      }

      toast.success("Event berhasil di-finalize!");
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      refetchResults();
    } catch (err: any) {
      toast.error(err.message ?? "An error occurred");
    } finally {
      setFinalizing(false);
    }
  };

  const handleSelfCheckin = async () => {
    if (!myContestant || !id) return;
    setCheckingIn(true);
    try {
      const nextBagDrop = (checkins?.length ?? 0) + 1;
      const nextLocker = (checkins?.length ?? 0) + 101;
      await supabase.from("event_checkins").insert({
        event_id: id,
        contestant_id: myContestant.id,
        bag_drop_number: nextBagDrop,
        locker_number: nextLocker,
      });
      toast.success(`Checked in! Bag #${nextBagDrop}, Locker #${nextLocker}`);
      refetchCheckins();
      setShowCheckinDialog(false);
    } catch (err: any) { toast.error(err.message); }
    finally { setCheckingIn(false); }
  };

  const handleAssignCart = async () => {
    if (!id || !selectedContestantForCart || !cartNumber) return;
    await supabase.from("golf_cart_assignments").insert({
      event_id: id,
      contestant_id: selectedContestantForCart,
      cart_number: parseInt(cartNumber),
    });
    toast.success("Cart assigned!");
    refetchCarts();
    setShowCartDialog(false);
    setCartNumber("");
    setSelectedContestantForCart("");
  };

  const handleAssignCaddy = async () => {
    if (!id || !selectedContestantForCaddy || !selectedCaddy) return;
    // Remove existing assignment for this contestant in this event first
    await supabase.from("caddy_assignments")
      .delete()
      .eq("event_id", id)
      .eq("contestant_id", selectedContestantForCaddy);
    await supabase.from("caddy_assignments").insert({
      event_id: id,
      contestant_id: selectedContestantForCaddy,
      course_caddy_id: selectedCaddy,
    });
    toast.success("Caddy assigned!");
    refetchCaddies();
    setShowCaddyDialog(false);
    setSelectedContestantForCaddy("");
    setSelectedCaddy("");
  };

  // Fetch course caddies for caddy dropdown
  const { data: courseCaddies } = useQuery({
    queryKey: ["course-caddies-event", event?.course_id],
    queryFn: async () => {
      const courseId = (event?.courses as any)?.id;
      if (!courseId) return [];
      const { data } = await supabase
        .from("course_caddies")
        .select("id, name, caddy_number")
        .eq("course_id", courseId)
        .eq("is_active", true)
        .order("name");
      return data ?? [];
    },
    enabled: !!event,
  });

  const statusColors: Record<string, string> = {
    draft: "border-muted-foreground/30 text-muted-foreground",
    registration: "border-accent/40 text-accent",
    checkin: "border-accent/40 text-accent",
    playing: "border-primary/40 text-primary",
    completed: "border-primary/60 text-primary",
  };

  const formatTeeTime = (t: string | null) => {
    if (!t) return "—";
    try { return new Date(t).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }); }
    catch { return t; }
  };

  if (isLoading) return (
    <div className="bottom-nav-safe space-y-4 p-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );

  if (!event) return (
    <div className="bottom-nav-safe p-4 text-center text-muted-foreground">Event not found</div>
  );

  const usedTickets = tickets?.filter(t => t.status !== "available").length ?? 0;

  // Shared content blocks
  const headerBlock = (
    <div className={isDesktop ? "" : "p-4"}>
      <button onClick={() => navigate(`/tour/${(event.tours as any)?.id}`)} className="mb-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
        ← {(event.tours as any)?.name}
      </button>
      <div className="flex items-start justify-between">
        <div>
          <h1 className={`font-display font-bold ${isDesktop ? "text-2xl" : "text-xl"}`}>{event.name}</h1>
          <div className={`mt-1 flex flex-wrap gap-x-3 text-muted-foreground ${isDesktop ? "text-sm gap-x-4" : "text-xs"}`}>
            <span className="flex items-center gap-1"><Calendar className={isDesktop ? "h-4 w-4" : "h-3 w-3"} /> {event.event_date}</span>
            <span className="flex items-center gap-1"><MapPin className={isDesktop ? "h-4 w-4" : "h-3 w-3"} /> {(event.courses as any)?.name}</span>
          </div>
        </div>
        <Badge variant="outline" className={`${isDesktop ? "text-xs" : "text-[10px]"} ${statusColors[event.status] ?? ""}`}>{event.status}</Badge>
      </div>
    </div>
  );

  // My Group card — shown to checked-in players when pairings exist
  const myGroupBlock = myContestant && isCheckedIn && myPairing ? (
    <div className="mx-4 mb-3">
      <div className="golf-card p-4 border-primary/30 bg-primary/5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-primary flex items-center gap-1.5">
            <Flag className="h-4 w-4" /> Grup Saya
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {myPairing.tee_time && (
              <span className="font-semibold text-foreground">
                {(() => { try { return new Date(myPairing.tee_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }); } catch { return myPairing.tee_time; } })()}
              </span>
            )}
            <span>Hole {myPairing.start_hole ?? 1}</span>
            <span className="font-semibold text-foreground">{myPairing.pairing_label}</span>
          </div>
        </div>
        <div className="space-y-2">
          {myGroupPlayers.map((pl: any) => {
            const isMe = pl.player_id === userId;
            return (
              <div key={pl.player_id} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 ${isMe ? "bg-primary/10 border border-primary/20" : "bg-card/60"}`}>
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                  {(pl.full_name ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isMe ? "text-primary" : ""}`}>
                    {pl.full_name ?? "—"} {isMe && <span className="text-[10px] font-normal">(Anda)</span>}
                  </p>
                  <p className="text-[10px] text-muted-foreground">HCP {pl.hcp ?? "—"}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  ) : null;

  const actionButtonsBlock = (
    <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-none">
      {myContestant && !isCheckedIn && (
        <Button size="sm" className="h-7 shrink-0 gap-1 text-[11px]" onClick={() => setShowCheckinDialog(true)}>
          <ClipboardCheck className="h-3 w-3" /> Check In
        </Button>
      )}
      {myContestant && isCheckedIn && (
        <Button
          size="sm"
          variant={event?.status === "completed" ? "outline" : "default"}
          className={`h-7 shrink-0 gap-1 text-[11px] ${
            event?.status === "completed"
              ? "opacity-50 cursor-not-allowed border-muted-foreground/30 text-muted-foreground"
              : ""
          }`}
          onClick={() => navigate(`/event/${id}/scorecard`)}
          disabled={event?.status === "completed"}
        >
          <Pencil className="h-3 w-3" />
          {event?.status === "completed" ? "Score Locked" : "Input Score"}
        </Button>
      )}
      {showAdminActions && (
        <>
          <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1 text-[11px]" onClick={() => setShowAssign(true)}>
            <Users className="h-3 w-3" /> Assign
          </Button>
          {event?.status !== "completed" ? (
            <Button
              size="sm"
              className="h-7 shrink-0 gap-1 text-[11px] bg-primary"
              onClick={() => setShowFinalizeConfirm(true)}
              disabled={finalizing}
            >
              <Trophy className="h-3 w-3" />
              {finalizing ? "Finalizing…" : "Finalize Event"}
            </Button>
          ) : (
            <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">
              ✓ Completed
            </Badge>
          )}
        </>
      )}
      <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1 text-[11px]" onClick={() => setShowWinners(true)}>
        <Trophy className="h-3 w-3" /> Results
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 shrink-0 gap-1 text-[11px] border-primary/40 text-primary hover:bg-primary/10"
        onClick={() => window.open(`/live/${id}`, "_blank")}
      >
        <Monitor className="h-3 w-3" /> Live Display
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 shrink-0 gap-1 text-[11px]"
        onClick={() => {
          const liveUrl = `${window.location.origin}/live/${id}`;
          if (navigator.share) {
            navigator.share({ title: event?.name ?? "Live Leaderboard", url: liveUrl });
          } else {
            navigator.clipboard.writeText(liveUrl).then(() => toast.success("Link live display ter-copy! 📋"));
          }
        }}
      >
        <Share2 className="h-3 w-3" /> Share
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 shrink-0 gap-1 text-[11px] bg-green-600/10 border-green-500/40 text-green-500 hover:bg-green-600/20"
        onClick={() => {
          const liveUrl = `${window.location.origin}/live/${id}`;
          const text = `🏌️ *${event?.name}*
Lihat leaderboard live turnamen ini di:
${liveUrl}`;
          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
        }}
      >
        <MessageCircle className="h-3 w-3" /> WA
      </Button>
      {event?.status === "completed" && (
        <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1 text-[11px]" onClick={handleExportPDF} disabled={exporting}>
          <Download className="h-3 w-3" /> {exporting ? "..." : "Export"}
        </Button>
      )}
    </div>
  );

  const tabsBlock = (
    <Tabs value={activeTab} onValueChange={setActiveTab} className={isDesktop ? "" : "px-4"}>
      <TabsList className="w-full overflow-x-auto flex">
        <TabsTrigger value="overview" className="flex-1 text-[11px]">Overview</TabsTrigger>
        <TabsTrigger value="checkin" className="flex-1 text-[11px]">Check-in</TabsTrigger>
        <TabsTrigger value="pairings" className="flex-1 text-[11px]">Pairings</TabsTrigger>
        <TabsTrigger value="leaderboard" className="flex-1 text-[11px]">Board</TabsTrigger>
        <TabsTrigger value="hcpcorr" className="flex-1 text-[11px]">HCP Corr</TabsTrigger>
      </TabsList>

      {/* OVERVIEW */}
      <TabsContent value="overview" className="space-y-4 pt-2">
        {showAdminActions && event?.status !== "completed" && (
          <div className="golf-card p-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium">Pairing Approval</p>
              <p className="text-[9px] text-muted-foreground">
                Review sebelum dipublikasikan ke pemain
              </p>
            </div>
            <Switch
              checked={event?.pairing_approval_required ?? false}
              onCheckedChange={async (val) => {
                await supabase
                  .from("events")
                  .update({ pairing_approval_required: val })
                  .eq("id", id!);
                queryClient.invalidateQueries({ queryKey: ["event", id] });
                toast.success(val
                  ? "Pairing approval aktif"
                  : "Pairing langsung dipublikasikan");
              }}
            />
          </div>
        )}

        <Section title="Contestants" icon={Users} count={contestants?.length}>
          {contestants?.length === 0 && <EmptyState text="No contestants" />}
          {contestants?.slice().sort((a: any, b: any) => ((a.profiles as any)?.full_name ?? "").localeCompare((b.profiles as any)?.full_name ?? "", "id")).slice(0, 10).map((c) => (
            <div key={c.id} className="golf-card flex items-center gap-3 p-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {(c.profiles as any)?.full_name?.charAt(0) ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{(c.profiles as any)?.full_name ?? "Unknown"}</p>
                <p className="text-xs text-muted-foreground">HCP {c.hcp ?? "—"} · {(c.tournament_flights as any)?.flight_name ?? "—"}</p>
              </div>
              <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
            </div>
          ))}
          {(contestants?.length ?? 0) > 10 && <p className="text-xs text-muted-foreground text-center py-1">+{(contestants!.length) - 10} more</p>}
        </Section>

        <Section title="Tickets" icon={Ticket} count={tickets?.length} sub={`${usedTickets} assigned`}>
          {tickets?.length === 0 && <EmptyState text="No tickets" />}
          {tickets?.slice(0, 6).map((t) => (
            <div key={t.id} className="golf-card flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium">#{t.ticket_number} · {(t.clubs as any)?.name}</p>
                <p className="text-xs text-muted-foreground">{t.assigned_player_id ? (t.profiles as any)?.full_name : "Unassigned"}</p>
              </div>
              <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
            </div>
          ))}
        </Section>

        <Section title="Results" icon={Award} count={results?.length}>
          {results?.length === 0 && <EmptyState text="No results yet" />}
          {results?.map((r) => (
            <div key={r.id} className="golf-card flex items-center gap-3 p-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">#{r.rank_position}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{(r.contestants as any)?.profiles?.full_name ?? "Unknown"}</p>
                <p className="text-xs text-muted-foreground">{(r.tournament_winner_categories as any)?.category_name} · {r.score_value}</p>
              </div>
            </div>
          ))}
        </Section>
      </TabsContent>

      {/* CHECK-IN */}
      <TabsContent value="checkin" className="pt-0">
        <EventCheckin eventId={id!} isAdmin={showAdminActions} userId={userId} event={event} tourId={(event?.tours as any)?.id} />
      </TabsContent>


      <TabsContent value="pairings" className="space-y-3 pt-2">
        {showAdminActions && pairingsList.length === 0 && (
          <div className="golf-card space-y-3 p-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Shuffle className="h-4 w-4 text-primary" /> Generate Pairings
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[10px]">Start Type</Label>
                <Select value={startType} onValueChange={setStartType}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tee_time">Tee Time</SelectItem>
                    <SelectItem value="shotgun">Shotgun</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">First Tee</Label>
                <Input type="time" value={firstTee} onChange={e => setFirstTee(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">Interval</Label>
                <Input type="number" value={interval} onChange={e => setInterval(e.target.value)} className="h-8 text-xs" disabled={startType === "shotgun"} />
              </div>
            </div>
            <Button size="sm" className="w-full gap-1" onClick={handleGeneratePairings} disabled={generating}>
              <Shuffle className="h-3.5 w-3.5" />
              {generating ? "Generating…" : (event?.pairing_approval_required ? "Generate (Draft)" : "Generate & Publish")}
            </Button>
          </div>
        )}

        {event?.pairing_approval_required && pairingsList.length > 0 && showAdminActions && (
          <div className="golf-card border-accent/30 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-accent">Pairing dalam status Draft</p>
                <p className="text-[10px] text-muted-foreground">Pemain belum bisa melihat group mereka</p>
              </div>
              <Button size="sm" className="h-7 text-xs"
                onClick={async () => {
                  await supabase.from("events").update({ pairing_approval_required: false }).eq("id", id!);
                  toast.success("Pairings dipublikasikan!");
                  queryClient.invalidateQueries({ queryKey: ["event", id] });
                }}>
                Publish
              </Button>
            </div>
          </div>
        )}

        {!showAdminActions && event?.pairing_approval_required && (
          <div className="golf-card p-6 text-center">
            <Clock className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">Pairing sedang dalam review</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Tournament director akan segera mempublikasikan grup Anda</p>
          </div>
        )}

        {(!event?.pairing_approval_required || showAdminActions) && (() => {
          const groups = pairingsList;
          if (groups.length === 0) {
            return <EmptyState text="No pairings generated yet" />;
          }

          const parMap: Record<number, number> = {};
          (courseHoles ?? []).forEach(h => { parMap[h.hole_number] = h.par; });

          const getFlightLevel = (hcp: number | null) => {
            if (hcp == null) return null;
            if (hcp <= 16) return { label: "A", cls: "bg-blue-500/10 text-blue-600 border-blue-500/30" };
            if (hcp <= 22) return { label: "B", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30" };
            return { label: "C", cls: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30" };
          };

          return (
            <>
              {/* Summary */}
              <div className="golf-card p-3 space-y-1">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Shuffle className="h-4 w-4 text-primary" />
                  {groups.length} Tee-off Groups
                </p>
                <p className="text-xs text-muted-foreground">Shotgun start · All groups tee off simultaneously</p>
              </div>

              {/* Card grid — no filter, show all */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {groups.map((g: any) => {
                  const slotLabel = g.slot ?? "A";
                  const badgeLabel = g.pairing_label ?? `${g.start_hole ?? 1}${slotLabel}`;
                  const badgeCls = slotLabel === "A"
                    ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                    : "bg-amber-500/10 text-amber-600 border-amber-500/30";
                   const playersArr = playersByPairing[g.id] ?? [];
                   const players = playersArr.sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0));
                   const par = parMap[g.start_hole ?? 1];
                   const teeTime = g.tee_time ? (() => {
                     try { return new Date(g.tee_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }); }
                     catch { return g.tee_time; }
                   })() : null;

                   return (
                     <div key={g.id} className="rounded-xl border bg-card/50 hover:shadow-md transition-shadow overflow-hidden">
                       {/* Card header */}
                       <div className="flex items-center gap-2 px-3 py-2.5 border-b bg-muted/30">
                         <Badge variant="outline" className={`text-[11px] font-bold ${badgeCls}`}>{badgeLabel}</Badge>
                         <span className="text-xs text-muted-foreground">Hole {g.start_hole ?? 1}</span>
                         {par && <span className="text-[10px] text-muted-foreground">· Par {par}</span>}
                         <span className="text-xs text-muted-foreground">· Slot {slotLabel}</span>
                         {teeTime && <span className="text-xs text-muted-foreground ml-auto font-medium">{teeTime}</span>}
                       </div>

                       {/* 2×2 player grid */}
                       <div className="grid grid-cols-2 gap-2 p-3">
                         {players.map((pp: any) => {
                            const level = getFlightLevel(pp.hcp);

                            return (
                              <button
                                key={pp.id}
                                onClick={() => pp.player_id && navigate(`/golfer/${pp.player_id}`)}
                                className="flex flex-col items-center gap-1.5 rounded-lg border bg-background/60 p-2.5 hover:bg-secondary/50 transition-colors text-center"
                              >
                                <Avatar className="h-9 w-9">
                                  <AvatarImage src={pp.avatar_url ?? ""} />
                                  <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                                    {(pp.full_name ?? "?").charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <p className="text-xs font-semibold truncate w-full">{pp.full_name}</p>
                                <div className="flex flex-wrap items-center justify-center gap-1">
                                  <Badge variant="outline" className="text-[9px]">HCP {pp.hcp ?? "—"}</Badge>
                                  {pp.flight_name && <Badge variant="outline" className={`text-[9px] ${level?.cls ?? ""}`}>{pp.flight_name}</Badge>}
                                </div>
                                {pp.club_name && <p className="text-[9px] text-muted-foreground truncate w-full">{pp.club_name}</p>}
                                {(pp.cart_number != null || pp.bag_number != null || pp.caddy_name) && (
                                  <div className="w-full border-t border-border/50 pt-1.5 mt-0.5 space-y-0.5">
                                    {pp.cart_number != null && (
                                      <p className="text-[9px] text-emerald-600 flex items-center justify-center gap-0.5">
                                        <Car className="h-2.5 w-2.5" /> Cart {pp.cart_number}
                                      </p>
                                    )}
                                    {pp.bag_number != null && (
                                      <p className="text-[9px] text-muted-foreground flex items-center justify-center gap-0.5">
                                        <Backpack className="h-2.5 w-2.5" /> Bag #{String(pp.bag_number).padStart(3, "0")}
                                      </p>
                                    )}
                                    {pp.caddy_name && (
                                      <p className="text-[9px] text-muted-foreground flex items-center justify-center gap-0.5 truncate">
                                        <User className="h-2.5 w-2.5 shrink-0" /> {pp.caddy_name.split(" ")[0]}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                         {players.length === 0 && (
                           <p className="col-span-2 text-xs text-muted-foreground text-center py-4">Belum ada pemain di-assign</p>
                         )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}
      </TabsContent>

      {/* BOARD (EGC Scoreboard) */}
      <TabsContent value="leaderboard" className="space-y-3 pt-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">{scoreboardData?.length ?? 0} players</p>
          <div className="flex gap-1.5">
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-[10px]" onClick={() => refetchScoreboard()}>
              <RefreshCw className="h-3 w-3" /> Refresh
            </Button>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-[10px]" onClick={async () => {
              if (!scoreboardRef.current) return;
              try {
                const canvas = await html2canvas(scoreboardRef.current, { scale: 2, useCORS: true, backgroundColor: null });
                const link = document.createElement("a");
                const eventName = (event?.name ?? "Event").replace(/\s+/g, "-");
                link.download = `${eventName}-Scoreboard.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();
                toast.success("Scoreboard exported!");
              } catch (err: any) { toast.error("Export failed: " + err.message); }
            }}>
              <Download className="h-3 w-3" /> Export PNG
            </Button>
          </div>
        </div>

        {(!scoreboardData || scoreboardData.length === 0) ? (
          <div className="golf-card p-6 text-center">
            <Trophy className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">No scores yet</p>
          </div>
        ) : (() => {
          // Group by flight
          const flights: Record<string, { name: string; min: number; max: number; order: number; rows: typeof scoreboardData }> = {};
          scoreboardData.forEach(r => {
            const key = r.flight_id ?? "unknown";
            if (!flights[key]) flights[key] = { name: r.flight_name, min: r.hcp_min, max: r.hcp_max, order: r.display_order, rows: [] };
            flights[key].rows.push(r);
          });
          const sortedFlights = Object.entries(flights).sort(([, a], [, b]) => a.order - b.order);

          const getRemarkAbbr = (cat: string) => {
            if (!cat) return "";
            if (cat.includes("Best Gross Overall")) return "BGO";
            if (cat.includes("Best Nett Overall")) return "BNO";
            if (cat.includes("Best Gross") && cat.includes("A")) return "BG A";
            if (cat.includes("Best Gross") && cat.includes("B")) return "BG B";
            if (cat.includes("Best Gross") && cat.includes("C")) return "BG C";
            if (cat.includes("Best Nett II")) return "BN II";
            if (cat.includes("Best Nett I")) return "BN I";
            if (cat.includes("Best Nett") && cat.includes("A")) return "BN A";
            if (cat.includes("Best Nett") && cat.includes("B")) return "BN B";
            if (cat.includes("Best Nett") && cat.includes("C")) return "BN C";
            return cat.length > 8 ? cat.slice(0, 8) : cat;
          };

          const flightHeaderCls = (name: string) => {
            const n = name.toLowerCase();
            if (n.includes("a")) return "bg-blue-600/90 text-blue-50";
            if (n.includes("b")) return "bg-amber-600/90 text-amber-50";
            if (n.includes("c")) return "bg-yellow-500/90 text-yellow-950";
            return "bg-muted text-muted-foreground";
          };

          const courseRating = (event?.courses as any)?.par ?? "";
          const courseName = (event?.courses as any)?.name ?? "";
          const tourName = (event?.tours as any)?.name ?? "";

          return (
            <div ref={scoreboardRef} className="bg-card rounded-lg overflow-hidden border">
              {/* Scoreboard header */}
              <div className="text-center py-3 px-4 border-b-2 border-border bg-card">
                <h2 className="text-sm font-bold tracking-wider text-foreground uppercase">{tourName}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {courseName} — {event?.event_date ? new Date(event.event_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : ""} — CR {courseRating}
                </p>
              </div>

              {/* Flight tables */}
              {sortedFlights.map(([flightId, flight]) => {
                const headerLabel = `${flight.name.toUpperCase()}   ${flight.min} – ${flight.max}`;
                return (
                  <div key={flightId} className="mb-0">
                    {/* Flight header */}
                    <div className={`px-3 py-1.5 flex items-center justify-between ${flightHeaderCls(flight.name)}`}>
                      <span className="text-xs font-bold tracking-wide">{headerLabel}</span>
                      <span className="text-[10px] font-medium opacity-80">({flight.rows.length} players)</span>
                    </div>
                    {/* Table */}
                    <div className="overflow-x-auto w-full -mx-0">
                    <table className="w-full border-collapse text-xs" style={{ fontFamily: "'Courier New', Courier, monospace", minWidth: "500px" }}>
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="w-[40px] text-center py-1 px-1 border-r border-border font-bold text-muted-foreground">NO</th>
                          <th className="text-left py-1 px-2 border-r border-border font-bold text-muted-foreground">PLAYER'S NAME</th>
                          <th className="text-left py-1 px-2 border-r border-border font-bold text-muted-foreground max-w-[120px]">CLUB</th>
                          <th className="w-[50px] text-center py-1 px-1 border-r border-border font-bold text-muted-foreground">OUT</th>
                          <th className="w-[50px] text-center py-1 px-1 border-r border-border font-bold text-muted-foreground">IN</th>
                          <th className="w-[50px] text-center py-1 px-1 border-r border-border font-bold text-muted-foreground">TOT</th>
                          <th className="w-[45px] text-center py-1 px-1 border-r border-border font-bold text-muted-foreground">HCP</th>
                          <th className="w-[50px] text-center py-1 px-1 border-r border-border font-bold text-muted-foreground">NETT</th>
                          <th className="w-[90px] text-center py-1 px-1 font-bold text-muted-foreground">REMARKS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {flight.rows.map((row, idx) => {
                          const remark = getRemarkAbbr(row.category_name);
                          const hasRemark = !!remark;
                          const isOverall = remark === "BGO" || remark === "BNO";
                          const remarkCls = isOverall
                            ? "text-amber-500 font-bold"
                            : hasRemark ? "text-blue-500 font-bold" : "";
                          const isNR = row.tot == null;

                          return (
                            <tr key={row.player_id} className={`border-b border-border/50 ${idx % 2 === 0 ? "bg-card" : "bg-muted/20"} hover:bg-accent/10 cursor-pointer`} onClick={() => setSelectedScoreboardPlayer(row)}>
                              <td className="text-center py-1 px-1 border-r border-border/50 text-muted-foreground">{idx + 1}</td>
                              <td className="py-1 px-2 border-r border-border/50 font-medium text-foreground truncate max-w-[180px]">{row.full_name}</td>
                              <td className="py-1 px-2 border-r border-border/50 text-foreground truncate max-w-[120px] text-[10px]">{row.club_name}</td>
                              <td className="text-center py-1 px-1 border-r border-border/50 tabular-nums text-foreground">{isNR ? <span className="text-destructive/60 text-[10px]">NR</span> : (row.out_score ?? <span className="text-muted-foreground">—</span>)}</td>
                              <td className="text-center py-1 px-1 border-r border-border/50 tabular-nums text-foreground">{isNR ? <span className="text-destructive/60 text-[10px]">NR</span> : (row.in_score ?? <span className="text-muted-foreground">—</span>)}</td>
                              <td className="text-center py-1 px-1 border-r border-border/50 tabular-nums text-foreground">{isNR ? <span className="text-destructive/60 text-[10px]">NR</span> : row.tot}</td>
                              <td className="text-center py-1 px-1 border-r border-border/50 tabular-nums text-muted-foreground">{row.hcp ?? "—"}</td>
                              <td className="text-center py-1 px-1 border-r border-border/50 tabular-nums font-bold text-foreground">
                                {isNR ? (
                                  <span className="text-destructive/60 text-[10px]">NR</span>
                                ) : hasRemark ? (
                                  <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full border-2 text-[10px] leading-none ${isOverall ? "border-amber-500 text-amber-500" : "border-blue-500 text-blue-500"}`}>
                                    {row.nett}
                                  </span>
                                ) : (
                                  row.nett ?? "—"
                                )}
                              </td>
                              <td className={`text-center py-1 px-1 text-[10px] ${remarkCls}`}>{remark}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    </div>
                  </div>
                );
              })}

              {/* Footer */}
              <div className="text-center py-2 border-t border-border bg-muted/30">
                <p className="text-[10px] text-muted-foreground">Generated by GolfBuana · {new Date().toLocaleDateString('id-ID')}</p>
              </div>
            </div>
          );
        })()}

        <Button variant="outline" size="sm" className="w-full mt-2 gap-1 text-xs" onClick={() => navigate(`/event/${id}/leaderboard`)}>
          <Trophy className="h-3.5 w-3.5" /> Full Leaderboard
        </Button>

        {event?.status === "completed" && (
          <Button
            size="sm"
            variant="outline"
            className="w-full mt-1 gap-1 text-xs bg-green-600/10 border-green-600/30 text-green-500 hover:bg-green-600/20"
            onClick={() => {
              const top3 = (leaderboard ?? [])
                .sort((a: any, b: any) => (a.rank_net ?? 999) - (b.rank_net ?? 999))
                .slice(0, 3);
              const winners = top3.map((r: any, i: number) => {
                const medal = ["🥇", "🥈", "🥉"][i];
                return `${medal} ${(r as any).profiles?.full_name ?? "Unknown"} — Net ${r.total_net}`;
              }).join("\n");
              const text = `🏆 Hasil Tournament GolfBuana\n\n` +
                `📌 ${event?.name}\n` +
                `📅 ${event?.event_date}\n` +
                `⛳ ${(event?.courses as any)?.name}\n\n` +
                `${winners}\n\n` +
                `Lihat lengkap: golfbuana.com`;
              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
            }}
          >
            💬 Share Hasil
          </Button>
        )}
      </TabsContent>

      {/* HCP CORRECTION TAB */}
      <TabsContent value="hcpcorr" className="space-y-3 pt-2">
        {(() => {
          const totalCorrected = hcpRows.length;
          const avgCorrection = totalCorrected > 0 ? (hcpRows.reduce((s: number, r: any) => s + r.delta, 0) / totalCorrected).toFixed(1) : "0";
          const promoCount = hcpRows.filter((r: any) => r.moved).length;

          const handleExportHcp = async () => {
            if (!hcpExportRef.current) return;
            setExporting(true);
            try {
              const canvas = await html2canvas(hcpExportRef.current, { backgroundColor: "#1a1a2e", scale: 2 });
              const link = document.createElement("a");
              link.download = `hcp-correction-${id}.png`;
              link.href = canvas.toDataURL();
              link.click();
              toast.success("HCP Correction exported!");
            } catch { toast.error("Export failed"); }
            setExporting(false);
          };

          if (hcpLoading) return <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>;

          return (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">
                  HCP Correction — <span className="font-semibold text-foreground">{totalCorrected}</span> players corrected
                </p>
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={handleExportHcp} disabled={exporting}>
                  <Download className="h-3 w-3" /> PNG
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3"> 
                <div className="golf-card p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{totalCorrected}</p>
                  <p className="text-[10px] text-muted-foreground">Total Corrected</p>
                </div>
                <div className="golf-card p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{avgCorrection}</p>
                  <p className="text-[10px] text-muted-foreground">Avg Correction</p>
                </div>
                <div className="golf-card p-3 text-center">
                  <p className={`text-lg font-bold ${promoCount > 0 ? "text-primary" : "text-foreground"}`}>{promoCount}</p>
                  <p className="text-[10px] text-muted-foreground">Flight Promotion</p>
                </div>
              </div>

              <div ref={hcpExportRef} className="rounded-lg overflow-hidden border border-border bg-card">
                <div className="overflow-x-auto w-full">
                <table className="w-full text-[11px]" style={{minWidth:"480px"}}>
                  <thead>
                    <tr className="bg-muted/60 border-b border-border">
                      <th className="py-1.5 px-2 text-center font-semibold w-8">NO</th>
                      <th className="py-1.5 px-2 text-left font-semibold">PLAYER'S NAME</th>
                      <th className="py-1.5 px-2 text-left font-semibold max-w-[100px]">CLUB</th>
                      <th className="py-1.5 px-2 text-center font-semibold">HCP AWAL</th>
                      <th className="py-1.5 px-2 text-center font-semibold">HCP KOREKSI</th>
                      <th className="py-1.5 px-2 text-center font-semibold">DELTA</th>
                      <th className="py-1.5 px-2 text-center font-semibold" title="Flight level after correction">FLIGHT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hcpRows.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-6 text-muted-foreground">No HCP corrections for this event</td></tr>
                    ) : hcpRows.map((row: any) => (
                      <tr key={row.player_id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="text-center py-1.5 px-2 tabular-nums text-muted-foreground">{row.no}</td>
                        <td className="py-1.5 px-2 font-medium text-foreground">{row.name}</td>
                        <td className="py-1.5 px-2 text-muted-foreground max-w-[100px] truncate">{row.club}</td>
                        <td className="text-center py-1.5 px-2 tabular-nums text-foreground">{row.old_hcp ?? "—"}</td>
                        <td className="text-center py-1.5 px-2 tabular-nums font-bold text-green-500">{row.new_hcp ?? "—"}</td>
                        <td className="text-center py-1.5 px-2 tabular-nums font-bold text-destructive">
                          {row.delta > 0 ? `–${row.delta}` : row.delta === 0 ? "0" : `+${Math.abs(row.delta)}`}
                        </td>
                        <td className="text-center py-1.5 px-2">
                          {row.moved ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px]">
                              <Badge variant="outline" className={`text-[9px] px-1 py-0 ${row.old_flight === "A" ? "border-blue-500 text-blue-500" : row.old_flight === "B" ? "border-amber-500 text-amber-500" : row.old_flight === "C" ? "border-yellow-500 text-yellow-600" : "border-muted-foreground text-muted-foreground"}`}>{row.old_flight}</Badge>
                              <span className="text-muted-foreground">→</span>
                              <Badge variant="outline" className={`text-[9px] px-1 py-0 ${row.new_flight === "A" ? "border-blue-500 text-blue-500" : row.new_flight === "B" ? "border-amber-500 text-amber-500" : row.new_flight === "C" ? "border-yellow-500 text-yellow-600" : "border-muted-foreground text-muted-foreground"}`}>{row.new_flight}</Badge>
                              <span className="text-green-500 font-bold">⬆</span>
                            </span>
                          ) : (
                            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${row.new_flight === "A" ? "border-blue-500 text-blue-500" : row.new_flight === "B" ? "border-amber-500 text-amber-500" : row.new_flight === "C" ? "border-yellow-500 text-yellow-600" : "border-muted-foreground text-muted-foreground"}`}>{row.new_flight}</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </>
          );
        })()}
      </TabsContent>
    </Tabs>
  );

  const dialogsBlock = (
    <>
      <AssignContestantDialog eventId={event.id} tourId={event.tour_id} open={showAssign} onOpenChange={setShowAssign} onDone={() => { setShowAssign(false); refetchContestants(); }} />
      <WinnerResultsDialog eventId={event.id} eventName={event.name} eventStatus={event.status} isOrganizer={!!isEventAdmin} open={showWinners} onOpenChange={setShowWinners} onDone={() => { setShowWinners(false); refetchResults(); }} />

      <Dialog open={showCheckinDialog} onOpenChange={setShowCheckinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Check-in</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="font-medium">{event.name}</p>
            <p className="text-muted-foreground">{(myContestant?.profiles as any)?.full_name}</p>
            <div className="golf-card p-3 space-y-1 mt-3">
              <p className="text-xs">Locker #: <span className="font-bold">{(checkins?.length ?? 0) + 101}</span></p>
              <p className="text-xs">Bag Drop #: <span className="font-bold">{(checkins?.length ?? 0) + 1}</span></p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckinDialog(false)}>Cancel</Button>
            <Button onClick={handleSelfCheckin} disabled={checkingIn}>
              {checkingIn ? "Checking in…" : "Konfirmasi Check-in"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCartDialog} onOpenChange={setShowCartDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Golf Cart</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Contestant</Label>
              <Select value={selectedContestantForCart} onValueChange={setSelectedContestantForCart}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pilih pemain" /></SelectTrigger>
                <SelectContent>
                  {contestants?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{(c.profiles as any)?.full_name ?? "Unknown"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Cart Number</Label>
              <Input type="number" value={cartNumber} onChange={e => setCartNumber(e.target.value)} placeholder="e.g. 1" className="h-9 text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCartDialog(false)}>Cancel</Button>
            <Button onClick={handleAssignCart} disabled={!selectedContestantForCart || !cartNumber}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCaddyDialog} onOpenChange={setShowCaddyDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Caddy</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Contestant</Label>
              <Select value={selectedContestantForCaddy} onValueChange={setSelectedContestantForCaddy}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pilih pemain" /></SelectTrigger>
                <SelectContent>
                  {contestants?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{(c.profiles as any)?.full_name ?? "Unknown"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Caddy</Label>
              {(!courseCaddies || courseCaddies.length === 0) ? (
                <div className="mt-1 rounded-lg border border-dashed border-border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Belum ada caddy terdaftar untuk course ini.</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Tambah caddy di Course Admin → tab Caddies.</p>
                </div>
              ) : (
                <Select value={selectedCaddy} onValueChange={setSelectedCaddy}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pilih caddy" /></SelectTrigger>
                  <SelectContent>
                    {courseCaddies.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}{c.caddy_number ? ` (#${c.caddy_number})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCaddyDialog(false)}>Cancel</Button>
            <Button onClick={handleAssignCaddy} disabled={!selectedContestantForCaddy || !selectedCaddy}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showFinalizeConfirm} onOpenChange={setShowFinalizeConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Finalize Event?</DialogTitle>
            <DialogDescription className="text-xs space-y-1 pt-2">
              <p>Tindakan ini akan:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Menghitung dan menyimpan pemenang</li>
                <li>Mengkoreksi Tournament HCP semua peserta</li>
                <li>Menutup event (tidak bisa dibuka lagi)</li>
              </ul>
              <p className="font-semibold pt-1">Pastikan semua scorecard sudah diinput.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowFinalizeConfirm(false)}>Cancel</Button>
            <Button onClick={handleFinalizeEvent} disabled={finalizing}>
              {finalizing ? "Finalizing…" : "Ya, Finalize"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Personal Scorecard Modal — tap any row in Board tab */}
      <Dialog open={!!selectedScoreboardPlayer} onOpenChange={(open) => { if (!open) setSelectedScoreboardPlayer(null); }}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="text-sm font-bold truncate">
              {selectedScoreboardPlayer?.full_name ?? "Scorecard"}
            </DialogTitle>
            <p className="text-[11px] text-muted-foreground">
              {selectedScoreboardPlayer?.club_name ?? ""} · Flight {selectedScoreboardPlayer?.flight_name ?? "—"} · HCP {selectedScoreboardPlayer?.hcp ?? "—"}
            </p>
          </DialogHeader>

          {playerHoleLoading ? (
            <div className="px-4 pb-4 space-y-2">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          ) : (
            <div className="px-4 pb-4 space-y-3">
              {/* OUT holes */}
              {Object.keys(playerHoleScores).length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] border-collapse" style={{ fontFamily: "'Courier New', monospace" }}>
                      <thead>
                        <tr className="bg-muted/60">
                          <th className="text-left py-1 px-2 font-semibold text-muted-foreground">Hole</th>
                          {[1,2,3,4,5,6,7,8,9].map(h => (
                            <th key={h} className="text-center py-1 px-1 font-semibold text-muted-foreground w-7">{h}</th>
                          ))}
                          <th className="text-center py-1 px-1 font-bold w-8">OUT</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-border/50">
                          <td className="py-1 px-2 text-muted-foreground font-medium">Score</td>
                          {[1,2,3,4,5,6,7,8,9].map(h => (
                            <td key={h} className="text-center py-1 px-1 tabular-nums">
                              {playerHoleScores[h] ?? <span className="text-muted-foreground/40">—</span>}
                            </td>
                          ))}
                          <td className="text-center py-1 px-1 font-bold tabular-nums">
                            {selectedScoreboardPlayer?.out_score ?? "—"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] border-collapse" style={{ fontFamily: "'Courier New', monospace" }}>
                      <thead>
                        <tr className="bg-muted/60">
                          <th className="text-left py-1 px-2 font-semibold text-muted-foreground">Hole</th>
                          {[10,11,12,13,14,15,16,17,18].map(h => (
                            <th key={h} className="text-center py-1 px-1 font-semibold text-muted-foreground w-7">{h}</th>
                          ))}
                          <th className="text-center py-1 px-1 font-bold w-8">IN</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-border/50">
                          <td className="py-1 px-2 text-muted-foreground font-medium">Score</td>
                          {[10,11,12,13,14,15,16,17,18].map(h => (
                            <td key={h} className="text-center py-1 px-1 tabular-nums">
                              {playerHoleScores[h] ?? <span className="text-muted-foreground/40">—</span>}
                            </td>
                          ))}
                          <td className="text-center py-1 px-1 font-bold tabular-nums">
                            {selectedScoreboardPlayer?.in_score ?? "—"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {/* Summary row */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/50">
                    <div className="text-center">
                      <p className="text-xs font-bold">{selectedScoreboardPlayer?.tot ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground">GROSS</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold">{selectedScoreboardPlayer?.hcp ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground">HCP</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-primary">{selectedScoreboardPlayer?.nett ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground">NETT</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <Flag className="mx-auto h-6 w-6 mb-2 opacity-30" />
                  <p>Scorecard belum diisi</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/50 pt-3">
                    <div className="text-center">
                      <p className="text-xs font-bold">{selectedScoreboardPlayer?.tot ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground">GROSS</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold">{selectedScoreboardPlayer?.hcp ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground">HCP</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-primary">{selectedScoreboardPlayer?.nett ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground">NETT</p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs gap-1"
                onClick={() => { setSelectedScoreboardPlayer(null); navigate(`/golfer/${selectedScoreboardPlayer?.player_id}`); }}
              >
                <User className="h-3 w-3" /> Lihat Profil
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );

  return (
    <div className="bottom-nav-safe">
      {isDesktop ? (
        <div className="flex gap-6 p-6 items-start">
          {/* Left column — Header + Actions + Tabs */}
          <div className="flex-1 min-w-0 space-y-4">
            {headerBlock}
            {actionButtonsBlock}
            {myGroupBlock}
            {tabsBlock}
          </div>

          {/* Right column — Stats + Leaderboard preview + Contestants */}
          <div className="w-72 xl:w-80 shrink-0 space-y-4 sticky top-20">
            {/* Quick Stats 2x2 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="golf-card p-3 text-center">
                <Users className="mx-auto h-4 w-4 text-primary mb-1" />
                <p className="text-xl font-bold">{contestants?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Players</p>
              </div>
              <div className="golf-card p-3 text-center">
                <ClipboardCheck className="mx-auto h-4 w-4 text-accent mb-1" />
                <p className="text-xl font-bold">{checkins?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Check-ins</p>
              </div>
              <div className="golf-card p-3 text-center">
                <Shuffle className="mx-auto h-4 w-4 text-primary mb-1" />
                <p className="text-xl font-bold">{pairingsList.length}</p>
                <p className="text-xs text-muted-foreground">Groups</p>
              </div>
              <div className="golf-card p-3 text-center">
                <Trophy className="mx-auto h-4 w-4 text-accent mb-1" />
                <p className="text-xl font-bold">{(event.courses as any)?.par ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Par</p>
              </div>
            </div>

            {/* Leaderboard preview top 5 */}
            {leaderboard && leaderboard.length > 0 && (
              <div className="golf-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold">Leaderboard</p>
                  <span className="text-xs text-muted-foreground">Top 5</span>
                </div>
                <div className="space-y-2">
                  {[...leaderboard]
                    .sort((a: any, b: any) => (a.rank_net ?? 999) - (b.rank_net ?? 999))
                    .slice(0, 5)
                    .map((row: any, i: number) => (
                      <div key={row.contestant_id} className="flex items-center gap-2 text-sm">
                        <span className={`w-6 text-center font-bold text-xs ${
                          i === 0 ? "text-yellow-500" :
                          i === 1 ? "text-muted-foreground" :
                          i === 2 ? "text-amber-600" :
                          "text-muted-foreground"
                        }`}>
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                        </span>
                        <span className="flex-1 truncate text-xs">
                          {(row as any).profiles?.full_name ?? "Unknown"}
                        </span>
                        <span className="text-xs font-semibold text-primary">
                          {row.total_net ?? "—"}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Contestants preview */}
            {contestants && contestants.length > 0 && (
              <div className="golf-card p-4">
                <p className="text-sm font-semibold mb-3">
                  Contestants ({contestants.length})
                </p>
                <div className="space-y-2">
                  {contestants.slice(0, 5).map((c: any) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={(c.profiles as any)?.avatar_url ?? ""} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {((c.profiles as any)?.full_name ?? "?").charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs flex-1 truncate">
                        {(c.profiles as any)?.full_name ?? "Unknown"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        HCP {c.hcp ?? "—"}
                      </span>
                    </div>
                  ))}
                  {contestants.length > 5 && (
                    <p className="text-[10px] text-muted-foreground text-center pt-1">
                      +{contestants.length - 5} lainnya
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {headerBlock}
          {/* Mobile Quick Stats */}
          <div className="grid grid-cols-4 gap-2 px-4 pb-3">
            <div className="golf-card p-2.5 text-center">
              <Users className="mx-auto h-3.5 w-3.5 text-primary" />
              <p className="text-base font-bold">{contestants?.length ?? 0}</p>
              <p className="text-[9px] text-muted-foreground">Players</p>
            </div>
            <div className="golf-card p-2.5 text-center">
              <ClipboardCheck className="mx-auto h-3.5 w-3.5 text-accent" />
              <p className="text-base font-bold">{checkins?.length ?? 0}</p>
              <p className="text-[9px] text-muted-foreground">Check-ins</p>
            </div>
            <div className="golf-card p-2.5 text-center">
              <Shuffle className="mx-auto h-3.5 w-3.5 text-primary" />
              <p className="text-base font-bold">{pairingsList.length}</p>
              <p className="text-[9px] text-muted-foreground">Groups</p>
            </div>
            <div className="golf-card p-2.5 text-center">
              <Trophy className="mx-auto h-3.5 w-3.5 text-accent" />
              <p className="text-base font-bold">{(event.courses as any)?.par ?? "—"}</p>
              <p className="text-[9px] text-muted-foreground">Par</p>
            </div>
          </div>
          {actionButtonsBlock}
          {myGroupBlock}
          {tabsBlock}
        </>
      )}
      {dialogsBlock}
    </div>
  );
};

// --- Helper Components ---
const Section = ({ title, icon: Icon, count, sub, children }: {
  title: string; icon: any; count?: number; sub?: string; children: React.ReactNode;
}) => (
  <div>
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="font-display text-sm font-semibold">{title}</h3>
      {count != null && <Badge variant="outline" className="text-[10px] ml-auto">{count}</Badge>}
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </div>
    <div className="space-y-2">{children}</div>
  </div>
);

const EmptyState = ({ text }: { text: string }) => (
  <div className="golf-card p-6 text-center text-sm text-muted-foreground">{text}</div>
);

export default EventDetail;
