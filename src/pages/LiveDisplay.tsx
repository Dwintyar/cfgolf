import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.svg";

/* ─── Types ─────────────────────────────────────────────── */
interface EventInfo {
  id: string;
  name: string;
  event_date: string;
  status: string;
  tour_id: string | null;
  courses: { name: string } | null;
  tours: { name: string } | null;
}

interface Flight {
  id: string;
  flight_name: string;
  hcp_min: number;
  hcp_max: number;
  display_order: number;
}

interface PlayerRow {
  rank: number;
  player_id: string;
  full_name: string;
  avatar_url: string | null;
  club_name: string | null;
  hcp: number | null;
  gross: number | null;
  nett: number | null;
  flight_id: string | null;
  prevRank?: number;
}

/* ─── Helpers ────────────────────────────────────────────── */
const fmt = (v: number | null) => (v == null ? "—" : String(v));

const RankBadge = ({ rank }: { rank: number }) => {
  if (rank === 1) return <span className="text-xl leading-none">🥇</span>;
  if (rank === 2) return <span className="text-xl leading-none">🥈</span>;
  if (rank === 3) return <span className="text-xl leading-none">🥉</span>;
  return <span className="text-sm font-bold text-white/40 tabular-nums">{rank}</span>;
};

const MoveBadge = ({ curr, prev }: { curr: number; prev?: number }) => {
  if (!prev || prev === curr) return null;
  const up = curr < prev;
  const diff = Math.abs(curr - prev);
  return (
    <span className={`text-[10px] font-bold ${up ? "text-green-400" : "text-red-400"}`}>
      {up ? `▲${diff}` : `▼${diff}`}
    </span>
  );
};

const AvatarCircle = ({ url, name }: { url: string | null; name: string }) => {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="h-7 w-7 rounded-full object-cover border border-white/20 shrink-0"
      />
    );
  }
  return (
    <div className="h-7 w-7 rounded-full bg-primary/30 flex items-center justify-center text-[11px] font-bold text-white border border-white/20 shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

/* ─── Flight Column ──────────────────────────────────────── */
const FlightColumn = ({
  flight,
  players,
  onRowClick,
  isLive = false,
}: {
  flight: Flight;
  players: PlayerRow[];
  onRowClick: (p: PlayerRow) => void;
  isLive?: boolean;
}) => {
  const [flashing, setFlashing] = useState<Set<string>>(new Set());
  // Track previous per-flight rank (not global rank)
  const prevFlightRankRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const changed = players.filter((p) => {
      const prevRank = prevFlightRankRef.current[p.player_id];
      return prevRank !== undefined && prevRank !== p.rank;
    }).map((p) => p.player_id);

    if (changed.length > 0) {
      setFlashing(new Set(changed));
      const t = setTimeout(() => setFlashing(new Set()), 1800);
      return () => clearTimeout(t);
    }
    // Save current per-flight ranks
    const newMap: Record<string, number> = {};
    players.forEach((p) => { newMap[p.player_id] = p.rank; });
    prevFlightRankRef.current = newMap;
  }, [players]);

  return (
    <div className="flex flex-col">
      {/* Flight header */}
      <div className="flex items-center justify-between px-3 py-2 mb-2 rounded-xl bg-primary/15 border border-primary/30">
        <div>
          <p className="text-sm font-extrabold tracking-wide text-primary uppercase">
            {flight.flight_name || "Flight"}
          </p>
          <p className="text-[10px] text-white/35">
            HCP {flight.hcp_min}–{flight.hcp_max}
          </p>
        </div>
        <span className="text-xs text-white/25">{players.length}p</span>
      </div>

      {/* Rows */}
      <div className="space-y-1">
        {players.length === 0 ? (
          <div className="text-center py-8 text-white/20 text-sm">No scores yet</div>
        ) : (
          players.map((p) => {
            const flash = flashing.has(p.player_id);
            const top3 = p.rank <= 3;
            return (
              <div
                key={p.player_id}
                onClick={() => onRowClick(p)}
                className={`
                  flex items-center gap-2 px-2.5 py-2 rounded-xl border cursor-pointer
                  transition-all duration-700 hover:border-primary/40 hover:bg-primary/10
                  ${flash ? "bg-yellow-400/20 border-yellow-400/50 scale-[1.015]" : ""}
                  ${!flash && top3 ? "bg-white/[0.06] border-white/10" : ""}
                  ${!flash && !top3 ? "bg-white/[0.02] border-white/[0.06]" : ""}
                `}
              >
                {/* Rank */}
                <div className="w-6 flex items-center justify-center shrink-0">
                  <RankBadge rank={p.rank} />
                </div>

                {/* Avatar */}
                <AvatarCircle url={p.avatar_url} name={p.full_name} />

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <p
                      className={`text-sm font-semibold truncate leading-tight ${
                        top3 ? "text-white" : "text-white/75"
                      }`}
                    >
                      {p.full_name}
                    </p>
                    {isLive && <MoveBadge curr={p.rank} prev={prevFlightRankRef.current[p.player_id]} />}
                  </div>
                  {p.club_name && (
                    <p className="text-[10px] text-white/30 truncate leading-tight">
                      {p.club_name}
                    </p>
                  )}
                </div>

                {/* HCP */}
                <div className="text-right shrink-0">
                  <p className="text-[9px] text-white/25 leading-none">HCP</p>
                  <p className="text-xs font-mono text-white/45 tabular-nums">
                    {fmt(p.hcp)}
                  </p>
                </div>

                {/* Gross */}
                <div className="text-right shrink-0 w-8">
                  <p className="text-[9px] text-white/25 leading-none">Grs</p>
                  <p className="text-xs font-mono tabular-nums">{fmt(p.gross)}</p>
                </div>

                {/* Nett — hero number */}
                <div className="text-right shrink-0 w-9">
                  <p className="text-[9px] text-white/25 leading-none">Nett</p>
                  <p
                    className={`text-base font-extrabold font-mono tabular-nums leading-tight ${
                      p.nett != null
                        ? top3
                          ? "text-primary"
                          : "text-white/80"
                        : "text-white/20"
                    }`}
                  >
                    {fmt(p.nett)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

/* ─── Main Page ──────────────────────────────────────────── */
const LiveDisplay = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [countdown, setCountdown] = useState(30);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRow | null>(null);
  const [holeScores, setHoleScores] = useState<Record<number, number>>({});
  const [holeLoading, setHoleLoading] = useState(false);
  const prevPlayersRef = useRef<PlayerRow[]>([]);
  const REFRESH_SEC = 30;

  const fetchData = useCallback(async () => {
    if (!eventId) return;

    /* 1. Event */
    const { data: ev } = await supabase
      .from("events")
      .select("id, name, event_date, status, tour_id, courses(name), tours(name)")
      .eq("id", eventId)
      .single();
    if (ev) setEvent(ev as EventInfo);

    /* 2. Flights */
    if (ev?.tour_id) {
      const { data: flightRows } = await supabase
        .from("tournament_flights")
        .select("id, flight_name, hcp_min, hcp_max, display_order")
        .eq("tour_id", ev.tour_id)
        .order("display_order");
      if (flightRows?.length) setFlights(flightRows as Flight[]);
    }

    /* 3. Leaderboard view */
    const { data: lbRows } = await supabase
      .from("event_leaderboard")
      .select("player_id, flight_id, hcp, rank_net, total_gross, total_net")
      .eq("event_id", eventId)
      .order("rank_net", { ascending: true });

    if (!lbRows?.length) {
      setLoading(false);
      return;
    }

    /* 4. Profiles */
    const pids = lbRows.map((r) => r.player_id).filter(Boolean) as string[];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", pids);

    const profMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
    (profiles ?? []).forEach((p: any) => {
      profMap[p.id] = p;
    });

    /* 5. Club names */
    const { data: memberRows } = await supabase
      .from("members")
      .select("user_id, clubs(name)")
      .in("user_id", pids);

    const clubMap: Record<string, string> = {};
    (memberRows ?? []).forEach((m: any) => {
      if (m.clubs?.name && !clubMap[m.user_id]) clubMap[m.user_id] = m.clubs.name;
    });

    /* 6. Build rows */
    const newPlayers: PlayerRow[] = lbRows.map((row) => {
      const prev = prevPlayersRef.current.find(
        (p) => p.player_id === row.player_id
      );
      return {
        rank: row.rank_net ?? 999,
        player_id: row.player_id!,
        full_name: profMap[row.player_id!]?.full_name ?? "Unknown",
        avatar_url: profMap[row.player_id!]?.avatar_url ?? null,
        club_name: clubMap[row.player_id!] ?? null,
        hcp: row.hcp ?? null,
        gross: row.total_gross ?? null,
        nett: row.total_net ?? null,
        flight_id: row.flight_id ?? null,
        prevRank: prev?.rank,
      };
    });

    prevPlayersRef.current = newPlayers;
    setPlayers(newPlayers);
    setLastRefresh(new Date());
    setLoading(false);
  }, [eventId]);

  /* Fetch hole scores for selected player */
  const fetchHoleScores = useCallback(async (player: PlayerRow) => {
    setHoleLoading(true);
    setHoleScores({});
    try {
      // Get event course + date
      const { data: evInfo } = await supabase
        .from("events")
        .select("course_id, event_date")
        .eq("id", eventId!)
        .single();
      if (!evInfo) return;

      // Find round via event_rounds first, fallback to date match
      const { data: eventRounds } = await supabase
        .from("event_rounds")
        .select("round_id")
        .eq("event_id", eventId!);

      let roundId: string | null = null;
      if (eventRounds?.length) {
        roundId = eventRounds[0].round_id;
      } else {
        const eventDate = evInfo.event_date?.slice(0, 10);
        const { data: roundRows } = await supabase
          .from("rounds")
          .select("id, created_at")
          .eq("course_id", evInfo.course_id)
          .order("created_at", { ascending: false });
        const matched = roundRows?.find((r: any) => r.created_at?.slice(0, 10) === eventDate) ?? roundRows?.[0];
        if (matched) roundId = matched.id;
      }

      if (!roundId) return;

      // Get scorecard
      const { data: sc } = await supabase
        .from("scorecards")
        .select("id")
        .eq("round_id", roundId)
        .eq("player_id", player.player_id)
        .maybeSingle();
      if (!sc) return;

      // Get hole scores
      const { data: holes } = await supabase
        .from("hole_scores")
        .select("hole_number, strokes")
        .eq("scorecard_id", sc.id)
        .order("hole_number");

      const map: Record<number, number> = {};
      (holes ?? []).forEach((h: any) => { map[h.hole_number] = h.strokes; });
      setHoleScores(map);
    } finally {
      setHoleLoading(false);
    }
  }, [eventId]);

  /* Fetch + interval */
  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, REFRESH_SEC * 1000);
    return () => clearInterval(iv);
  }, [fetchData]);

  /* Countdown */
  useEffect(() => {
    setCountdown(REFRESH_SEC);
    const t = setInterval(
      () => setCountdown((c) => (c <= 1 ? REFRESH_SEC : c - 1)),
      1000
    );
    return () => clearInterval(t);
  }, [lastRefresh]);

  /* Group players by flight, rank within flight */
  const grouped = useCallback(() => {
    if (!flights.length) return [];
    return flights.map((f) => {
      const fp = players
        .filter((p) => p.flight_id === f.id)
        .sort((a, b) => {
          if (a.nett == null && b.nett == null) return 0;
          if (a.nett == null) return 1;
          if (b.nett == null) return -1;
          return a.nett - b.nett;
        })
        .map((p, i) => ({ ...p, rank: i + 1 }));
      return { flight: f, players: fp };
    });
  }, [flights, players]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#080f1e] flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-white/40">Loading leaderboard…</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#080f1e] flex items-center justify-center text-white/30 text-lg">
        Event not found.
      </div>
    );
  }

  const flightGroups = grouped();
  const cols = Math.min(Math.max(flightGroups.length, 1), 4);

  return (
    <div className="min-h-screen bg-[#080f1e] text-white flex flex-col">
      {/* ── HEADER ── */}
      <header className="shrink-0 bg-gradient-to-r from-[#0b1e35] via-[#0d2a45] to-[#0b1e35] border-b border-white/10 px-6 py-3 flex items-center gap-4">
        <img
          src={logo}
          alt="GolfBuana"
          className="h-10 w-10 rounded-xl object-contain shrink-0"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            {(event.tours as any)?.name && (
              <span className="text-[11px] font-bold uppercase tracking-widest text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                {(event.tours as any).name}
              </span>
            )}
            <span
              className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                event.status === "ongoing"
                  ? "text-green-400 bg-green-400/10 border-green-400/30 animate-pulse"
                  : "text-white/30 bg-white/5 border-white/10"
              }`}
            >
              {event.status === "ongoing" ? "🔴 LIVE" : event.status}
            </span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight truncate leading-tight">
            {event.name}
          </h1>
          <p className="text-xs text-white/35">
            {(event.courses as any)?.name} · {event.event_date}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <div className="flex items-center gap-1.5 justify-end mb-0.5">
            <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-white/45">
              Refresh{" "}
              <span className="text-white font-bold tabular-nums">{countdown}s</span>
            </span>
          </div>
          <p className="text-[10px] text-white/20">
            {lastRefresh.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
        </div>

        <div className="shrink-0 hidden xl:block text-right border-l border-white/10 pl-4">
          <p className="text-xs font-bold text-white/15 uppercase tracking-widest">
            GolfBuana
          </p>
          <p className="text-[10px] text-white/10">golfbuana.com</p>
        </div>
      </header>

      {/* ── FLIGHT COLUMNS ── */}
      <main
        className="flex-1 overflow-auto px-4 py-4"
        style={{ minHeight: 0 }}
      >
        {flightGroups.length > 0 ? (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
          >
            {flightGroups.map(({ flight, players: fp }) => (
              <FlightColumn key={flight.id} flight={flight} players={fp} isLive={event?.status === "ongoing"} onRowClick={(p) => { setSelectedPlayer(p); fetchHoleScores(p); }} />
            ))}
          </div>
        ) : players.length > 0 ? (
          /* No flights defined — single column */
          <div className="max-w-2xl mx-auto">
            <FlightColumn
              flight={{
                id: "all",
                flight_name: "Leaderboard",
                hcp_min: 0,
                hcp_max: 54,
                display_order: 0,
              }}
              players={players}
              isLive={event?.status === "ongoing"}
              onRowClick={(p) => { setSelectedPlayer(p); fetchHoleScores(p); }}
            />
          </div>
        ) : (
          /* Empty */
          <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-white/20">
            <div className="text-7xl mb-4">⛳</div>
            <p className="text-xl font-semibold">Scores not yet submitted</p>
            <p className="text-sm mt-2 text-white/15">
              Leaderboard updates every {REFRESH_SEC}s
            </p>
          </div>
        )}
      </main>

      {/* ── SCORECARD MODAL ── */}
      {selectedPlayer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setSelectedPlayer(null)}
        >
          <div
            className="bg-[#0d1f35] border border-white/15 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
              <AvatarCircle url={selectedPlayer.avatar_url} name={selectedPlayer.full_name} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate">{selectedPlayer.full_name}</p>
                <p className="text-xs text-white/40">
                  {selectedPlayer.club_name ?? "—"} · HCP {fmt(selectedPlayer.hcp)}
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-center">
                  <p className="text-[10px] text-white/30 uppercase">Gross</p>
                  <p className="text-lg font-bold tabular-nums">{fmt(selectedPlayer.gross)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-primary/70 uppercase">Nett</p>
                  <p className="text-2xl font-extrabold text-primary tabular-nums">{fmt(selectedPlayer.nett)}</p>
                </div>
                <button
                  onClick={() => setSelectedPlayer(null)}
                  className="text-white/30 hover:text-white transition-colors text-xl leading-none ml-2"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Scorecard body */}
            <div className="px-5 py-4">
              {holeLoading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-white/30">
                  <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <span className="text-sm">Loading scorecard…</span>
                </div>
              ) : Object.keys(holeScores).length > 0 ? (
                <div className="space-y-3">
                  {/* OUT */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse font-mono">
                      <thead>
                        <tr className="bg-white/5">
                          <th className="text-left py-1.5 px-2 text-white/40 font-semibold">Hole</th>
                          {[1,2,3,4,5,6,7,8,9].map(h => (
                            <th key={h} className="text-center py-1.5 px-1 text-white/40 w-8">{h}</th>
                          ))}
                          <th className="text-center py-1.5 px-1 text-white font-bold w-10">OUT</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-white/5">
                          <td className="py-1.5 px-2 text-white/50">Score</td>
                          {[1,2,3,4,5,6,7,8,9].map(h => (
                            <td key={h} className="text-center py-1.5 px-1 tabular-nums text-white">
                              {holeScores[h] ?? <span className="text-white/20">—</span>}
                            </td>
                          ))}
                          <td className="text-center py-1.5 px-1 font-bold text-white tabular-nums">
                            {[1,2,3,4,5,6,7,8,9].reduce((s,h) => s + (holeScores[h] ?? 0), 0) || "—"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {/* IN */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse font-mono">
                      <thead>
                        <tr className="bg-white/5">
                          <th className="text-left py-1.5 px-2 text-white/40 font-semibold">Hole</th>
                          {[10,11,12,13,14,15,16,17,18].map(h => (
                            <th key={h} className="text-center py-1.5 px-1 text-white/40 w-8">{h}</th>
                          ))}
                          <th className="text-center py-1.5 px-1 text-white font-bold w-10">IN</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-white/5">
                          <td className="py-1.5 px-2 text-white/50">Score</td>
                          {[10,11,12,13,14,15,16,17,18].map(h => (
                            <td key={h} className="text-center py-1.5 px-1 tabular-nums text-white">
                              {holeScores[h] ?? <span className="text-white/20">—</span>}
                            </td>
                          ))}
                          <td className="text-center py-1.5 px-1 font-bold text-white tabular-nums">
                            {[10,11,12,13,14,15,16,17,18].reduce((s,h) => s + (holeScores[h] ?? 0), 0) || "—"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/10">
                    <div className="text-center bg-white/5 rounded-xl py-2">
                      <p className="text-[10px] text-white/30 uppercase">OUT</p>
                      <p className="text-lg font-bold tabular-nums">
                        {[1,2,3,4,5,6,7,8,9].reduce((s,h) => s + (holeScores[h] ?? 0), 0) || "—"}
                      </p>
                    </div>
                    <div className="text-center bg-white/5 rounded-xl py-2">
                      <p className="text-[10px] text-white/30 uppercase">IN</p>
                      <p className="text-lg font-bold tabular-nums">
                        {[10,11,12,13,14,15,16,17,18].reduce((s,h) => s + (holeScores[h] ?? 0), 0) || "—"}
                      </p>
                    </div>
                    <div className="text-center bg-primary/20 border border-primary/30 rounded-xl py-2">
                      <p className="text-[10px] text-primary/70 uppercase">Gross</p>
                      <p className="text-lg font-bold text-primary tabular-nums">{fmt(selectedPlayer.gross)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-white/25">
                  <p className="text-2xl mb-2">📋</p>
                  <p className="text-sm">No hole-by-hole data available</p>
                  <p className="text-xs mt-1 text-white/15">Gross: {fmt(selectedPlayer.gross)} · Nett: {fmt(selectedPlayer.nett)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer className="shrink-0 border-t border-white/5 px-6 py-2 flex items-center justify-between">
        <p className="text-[10px] text-white/20">
          {players.length} Players ·{" "}
          {flightGroups.length > 0
            ? `${flightGroups.length} Flights`
            : "Open Flight"}{" "}
          · Sorted by Nett Score
        </p>
        <p className="text-[10px] text-white/15">
          Powered by GolfBuana · golfbuana.com
        </p>
      </footer>
    </div>
  );
};

export default LiveDisplay;
