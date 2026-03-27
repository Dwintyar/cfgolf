import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.svg";

/* ─── Types ─────────────────────────────────────────────── */
interface EventInfo {
  id: string;
  name: string;
  event_date: string;
  status: string;
  courses: { name: string } | null;
  tours: { name: string } | null;
}

interface LeaderEntry {
  rank: number;
  player_id: string;
  full_name: string;
  avatar_url: string | null;
  club_name: string | null;
  hcp: number | null;
  gross: number | null;
  nett: number | null;
  out_score: number | null;
  in_score: number | null;
  remarks: string | null;
}

/* ─── Helpers ────────────────────────────────────────────── */
const fmt = (v: number | null) => (v == null ? "-" : String(v));
const avatar = (url: string | null, name: string) => {
  if (url) return <img src={url} alt={name} className="h-10 w-10 rounded-full object-cover border-2 border-white/20" />;
  return (
    <div className="h-10 w-10 rounded-full bg-primary/30 flex items-center justify-center text-sm font-bold text-primary-foreground border-2 border-white/20">
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

const medalBg = (rank: number) => {
  if (rank === 1) return "bg-yellow-500/20 border-yellow-400/40";
  if (rank === 2) return "bg-slate-400/20 border-slate-300/40";
  if (rank === 3) return "bg-amber-700/20 border-amber-600/40";
  return "bg-white/5 border-white/10";
};

const medalText = (rank: number) => {
  if (rank === 1) return "text-yellow-300 font-extrabold";
  if (rank === 2) return "text-slate-300 font-bold";
  if (rank === 3) return "text-amber-500 font-bold";
  return "text-white/60";
};

/* ─── Live Display Page ──────────────────────────────────── */
const LiveDisplay = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [board, setBoard] = useState<LeaderEntry[]>([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const REFRESH_SECONDS = 60;

  const fetchData = useCallback(async () => {
    if (!eventId) return;

    /* Event info */
    const { data: ev } = await supabase
      .from("events")
      .select("id, name, event_date, status, courses(name), tours(name)")
      .eq("id", eventId)
      .single();
    if (ev) setEvent(ev as EventInfo);

    /* Contestants + profiles + clubs */
    const { data: contestants } = await supabase
      .from("contestants")
      .select(`
        player_id, hcp, status,
        profiles:player_id ( full_name, avatar_url ),
        members!inner ( clubs ( name ) )
      `)
      .eq("event_id", eventId)
      .eq("status", "confirmed");

    /* Scorecards for this event via rounds */
    const { data: rounds } = await supabase
      .from("rounds")
      .select("id")
      .eq("event_id", eventId);

    const roundIds = (rounds ?? []).map((r: any) => r.id);

    let scorecardMap: Record<string, { gross: number | null; nett: number | null }> = {};
    if (roundIds.length > 0) {
      const { data: scorecards } = await supabase
        .from("scorecards")
        .select("player_id, gross_score, net_score")
        .in("round_id", roundIds);
      (scorecards ?? []).forEach((s: any) => {
        scorecardMap[s.player_id] = { gross: s.gross_score, nett: s.net_score };
      });
    }

    /* Also try contestants table for out/in/nett if stored there */
    const { data: boardData } = await supabase
      .from("contestants")
      .select(`
        player_id, hcp,
        out_score, in_score, gross_score, nett_score, remarks,
        profiles:player_id ( full_name, avatar_url )
      `)
      .eq("event_id", eventId)
      .eq("status", "confirmed");

    /* Build leaderboard entries */
    const entries: LeaderEntry[] = (boardData ?? contestants ?? []).map((c: any) => {
      const sc = scorecardMap[c.player_id];
      const gross = c.gross_score ?? sc?.gross ?? null;
      const nett = c.nett_score ?? sc?.nett ?? null;
      const clubName = c.members?.[0]?.clubs?.name ?? null;
      return {
        rank: 0,
        player_id: c.player_id,
        full_name: c.profiles?.full_name ?? "Unknown",
        avatar_url: c.profiles?.avatar_url ?? null,
        club_name: clubName,
        hcp: c.hcp ?? null,
        gross,
        nett,
        out_score: c.out_score ?? null,
        in_score: c.in_score ?? null,
        remarks: c.remarks ?? null,
      };
    });

    /* Sort: nett asc (nulls last), then gross asc */
    entries.sort((a, b) => {
      if (a.nett == null && b.nett == null) return 0;
      if (a.nett == null) return 1;
      if (b.nett == null) return -1;
      if (a.nett !== b.nett) return a.nett - b.nett;
      return (a.gross ?? 999) - (b.gross ?? 999);
    });

    /* Assign rank */
    entries.forEach((e, i) => { e.rank = i + 1; });

    setBoard(entries);
    setLastRefresh(new Date());
    setLoading(false);
  }, [eventId]);

  /* Initial + interval fetch */
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_SECONDS * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  /* Countdown tick */
  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 1000);
    return () => clearInterval(t);
  }, [lastRefresh]);

  const secondsLeft = REFRESH_SECONDS - (Math.floor((Date.now() - lastRefresh.getTime()) / 1000) % REFRESH_SECONDS);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-lg">Loading leaderboard…</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center text-white/60 text-xl">
        Event not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] text-white font-sans overflow-hidden">
      {/* ── Header ── */}
      <header className="relative bg-gradient-to-r from-[#0d2137] via-[#0f3050] to-[#0d2137] border-b border-white/10 px-8 py-5 flex items-center gap-6">
        {/* Logo */}
        <img src={logo} alt="GolfBuana" className="h-12 w-12 rounded-xl object-contain shrink-0" />

        {/* Event info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-0.5">
            {(event.tours as any)?.name && (
              <span className="text-xs font-semibold uppercase tracking-widest text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                {(event.tours as any).name}
              </span>
            )}
            <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              event.status === "ongoing"
                ? "text-green-400 bg-green-400/10 border-green-400/30"
                : "text-white/40 bg-white/5 border-white/10"
            }`}>
              {event.status === "ongoing" ? "🔴 LIVE" : event.status}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight leading-tight truncate">{event.name}</h1>
          <p className="text-sm text-white/50 mt-0.5">
            {(event.courses as any)?.name} &nbsp;·&nbsp; {event.event_date}
          </p>
        </div>

        {/* Refresh indicator */}
        <div className="shrink-0 text-right">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-1">Auto-refresh</p>
          <div className="flex items-center gap-2 justify-end">
            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-white/60 tabular-nums">{secondsLeft}s</span>
          </div>
          <p className="text-[10px] text-white/20 mt-1">
            Last: {lastRefresh.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        </div>

        {/* GolfBuana watermark */}
        <div className="shrink-0 text-right hidden xl:block">
          <p className="text-xs font-bold text-white/20 uppercase tracking-widest">GolfBuana</p>
          <p className="text-[10px] text-white/10">golfbuana.com</p>
        </div>
      </header>

      {/* ── Leaderboard Table ── */}
      <main className="px-6 py-4 overflow-auto" style={{ maxHeight: "calc(100vh - 120px)" }}>
        {board.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-white/30">
            <div className="text-6xl mb-4">⛳</div>
            <p className="text-xl font-semibold">Scores not yet submitted</p>
            <p className="text-sm mt-2">Leaderboard will update automatically as scores come in.</p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-[11px] uppercase tracking-widest text-white/30 border-b border-white/10">
                <th className="py-3 pl-4 text-left w-12">Pos</th>
                <th className="py-3 text-left">Player</th>
                <th className="py-3 text-left hidden lg:table-cell">Club</th>
                <th className="py-3 text-center w-14">HCP</th>
                <th className="py-3 text-center w-14 hidden xl:table-cell">OUT</th>
                <th className="py-3 text-center w-14 hidden xl:table-cell">IN</th>
                <th className="py-3 text-center w-16">Gross</th>
                <th className="py-3 text-center w-16">Nett</th>
                <th className="py-3 text-center w-24 hidden lg:table-cell">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {board.map((entry, idx) => (
                <tr
                  key={entry.player_id}
                  className={`border border-white/5 rounded-xl transition-all ${medalBg(entry.rank)} ${
                    idx % 2 === 0 ? "" : "bg-white/[0.02]"
                  }`}
                  style={{ marginBottom: "6px" }}
                >
                  {/* Rank */}
                  <td className="py-4 pl-4">
                    <span className={`text-2xl tabular-nums ${medalText(entry.rank)}`}>
                      {entry.rank <= 3
                        ? ["🥇", "🥈", "🥉"][entry.rank - 1]
                        : entry.rank}
                    </span>
                  </td>

                  {/* Player */}
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      {avatar(entry.avatar_url, entry.full_name)}
                      <span className="font-semibold text-base leading-tight">{entry.full_name}</span>
                    </div>
                  </td>

                  {/* Club */}
                  <td className="py-4 pr-4 hidden lg:table-cell">
                    <span className="text-sm text-white/50">{entry.club_name ?? "—"}</span>
                  </td>

                  {/* HCP */}
                  <td className="py-4 text-center">
                    <span className="text-sm font-mono text-white/70">{fmt(entry.hcp)}</span>
                  </td>

                  {/* OUT */}
                  <td className="py-4 text-center hidden xl:table-cell">
                    <span className="text-sm font-mono">{fmt(entry.out_score)}</span>
                  </td>

                  {/* IN */}
                  <td className="py-4 text-center hidden xl:table-cell">
                    <span className="text-sm font-mono">{fmt(entry.in_score)}</span>
                  </td>

                  {/* Gross */}
                  <td className="py-4 text-center">
                    <span className="text-lg font-bold font-mono">{fmt(entry.gross)}</span>
                  </td>

                  {/* Nett — highlighted */}
                  <td className="py-4 text-center">
                    <span className={`text-xl font-extrabold font-mono tabular-nums ${
                      entry.nett != null ? "text-primary" : "text-white/30"
                    }`}>
                      {fmt(entry.nett)}
                    </span>
                  </td>

                  {/* Remarks */}
                  <td className="py-4 text-center hidden lg:table-cell">
                    <span className="text-xs text-white/40">{entry.remarks ?? ""}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#0a1628]/90 backdrop-blur border-t border-white/5 px-8 py-2 flex items-center justify-between">
        <p className="text-[10px] text-white/20 uppercase tracking-widest">
          {board.length} Players · Sorted by Nett Score
        </p>
        <p className="text-[10px] text-white/20">Powered by GolfBuana · golfbuana.com</p>
      </footer>
    </div>
  );
};

export default LiveDisplay;
