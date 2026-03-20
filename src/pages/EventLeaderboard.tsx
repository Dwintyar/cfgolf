import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Calendar, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const EventLeaderboard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: event, isLoading: loadingEvent } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, courses(name, location, par, id), tours(name, id)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Leaderboard from scorecards (same approach as Board tab)
  const { data: leaderboardRows, isLoading: loadingLb } = useQuery({
    queryKey: ["event-leaderboard-scorecards", id],
    queryFn: async () => {
      if (!id) return [];

      const { data: eventInfo } = await supabase
        .from("events")
        .select("course_id, event_date")
        .eq("id", id)
        .single();
      if (!eventInfo?.course_id) return [];

      // Get contestants with profiles and flights
      const { data: eventContestants } = await supabase
        .from("contestants")
        .select(`
          id, player_id, hcp, flight_id,
          profiles ( full_name, avatar_url ),
          tournament_flights ( flight_name )
        `)
        .eq("event_id", id);
      if (!eventContestants?.length) return [];

      const playerIds = eventContestants.map(c => c.player_id);

      // Find round matching event_date
      const eventDate = eventInfo.event_date.slice(0, 10);
      const { data: allRounds } = await supabase
        .from("rounds")
        .select("id, created_at")
        .eq("course_id", eventInfo.course_id);

      const matchedRound = allRounds?.find(r => r.created_at.slice(0, 10) === eventDate)
        ?? allRounds?.[0];
      let roundId = matchedRound?.id;

      if (!roundId) {
        return eventContestants.map(ct => ({
          player_id: ct.player_id,
          full_name: (ct.profiles as any)?.full_name ?? "Unknown",
          avatar_url: (ct.profiles as any)?.avatar_url ?? null,
          hcp: ct.hcp,
          flight_id: ct.flight_id,
          flight_name: (ct.tournament_flights as any)?.flight_name ?? null,
          total_gross: null,
          total_net: null,
          contestant_id: ct.id,
        }));
      }

      // Fetch scorecards
      const { data: scorecards } = await supabase
        .from("scorecards")
        .select("id, player_id, gross_score, net_score")
        .eq("round_id", roundId)
        .in("player_id", playerIds);

      const scoreMap: Record<string, { gross: number | null; net: number | null }> = {};
      (scorecards ?? []).forEach(sc => {
        if (scoreMap[sc.player_id]) return;
        scoreMap[sc.player_id] = { gross: sc.gross_score, net: sc.net_score };
      });

      return eventContestants.map(ct => ({
        player_id: ct.player_id,
        full_name: (ct.profiles as any)?.full_name ?? "Unknown",
        avatar_url: (ct.profiles as any)?.avatar_url ?? null,
        hcp: ct.hcp,
        flight_id: ct.flight_id,
        flight_name: (ct.tournament_flights as any)?.flight_name ?? null,
        total_gross: scoreMap[ct.player_id]?.gross ?? null,
        total_net: scoreMap[ct.player_id]?.net ?? null,
        contestant_id: ct.id,
      }));
    },
    enabled: !!id,
    refetchInterval: 15000,
  });

  const sortedNet = [...(leaderboardRows ?? [])].filter(r => r.total_net != null).sort((a, b) => a.total_net! - b.total_net!);
  const sortedGross = [...(leaderboardRows ?? [])].filter(r => r.total_gross != null).sort((a, b) => a.total_gross! - b.total_gross!);

  const isLoading = loadingEvent || loadingLb;

  if (isLoading) return (
    <div className="bottom-nav-safe space-y-4 p-4">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-xl" />
      ))}
    </div>
  );

  if (!event) return (
    <div className="bottom-nav-safe p-4 text-center text-muted-foreground">Event not found</div>
  );

  const getFlightBadgeCls = (name: string | null) => {
    if (!name) return "";
    const l = name.toUpperCase().charAt(0);
    if (l === "A") return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    if (l === "B") return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    return "bg-muted text-muted-foreground border-border";
  };

  const renderTable = (rows: typeof sortedNet) => (
    <div className="space-y-1">
      <div className="grid grid-cols-[2rem_1fr_4rem_3.5rem_3.5rem] gap-1 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>#</span>
        <span>Player</span>
        <span>Flight</span>
        <span className="text-right">Gross</span>
        <span className="text-right">Net</span>
      </div>
      {rows.length === 0 && (
        <div className="golf-card p-6 text-center text-sm text-muted-foreground">No scores yet</div>
      )}
      {rows.map((r, idx) => (
        <div
          key={r.contestant_id}
          className={`golf-card grid grid-cols-[2rem_1fr_4rem_3.5rem_3.5rem] items-center gap-1 px-3 py-2.5 animate-fade-in ${idx < 3 ? "border-primary/20" : ""}`}
          style={{ animationDelay: `${idx * 30}ms` }}
        >
          <span className={`text-sm font-bold tabular-nums ${idx === 0 ? "text-accent" : idx < 3 ? "text-primary" : "text-muted-foreground"}`}>
            {idx + 1}
          </span>
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {r.full_name.charAt(0)}
            </div>
            <div className="min-w-0 cursor-pointer" onClick={() => navigate(`/profile/${r.player_id}`)}>
              <p className="text-sm font-medium truncate hover:text-primary transition-colors">{r.full_name}</p>
              <p className="text-[10px] text-muted-foreground">HCP {r.hcp ?? "—"}</p>
            </div>
          </div>
          <div>
            {r.flight_name ? (
              <Badge variant="outline" className={`text-[9px] ${getFlightBadgeCls(r.flight_name)}`}>{r.flight_name}</Badge>
            ) : (
              <span className="text-[10px] text-muted-foreground">—</span>
            )}
          </div>
          <span className="text-right text-sm tabular-nums font-medium">{r.total_gross ?? "—"}</span>
          <span className="text-right text-sm tabular-nums font-bold text-primary">{r.total_net ?? "—"}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="bottom-nav-safe">
      <div className="p-4">
        <button onClick={() => navigate(`/event/${id}`)} className="mb-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← {event.name}
        </button>
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-accent" />
          <h1 className="font-display text-xl font-bold">Leaderboard</h1>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {event.event_date}</span>
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {(event.courses as any)?.name}</span>
          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {sortedNet.length} players with scores</span>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">Auto-refreshes every 15 seconds</p>
      </div>

      <Tabs defaultValue="net" className="px-4">
        <TabsList className="w-full">
          <TabsTrigger value="net" className="flex-1 text-xs">Net Score</TabsTrigger>
          <TabsTrigger value="gross" className="flex-1 text-xs">Gross Score</TabsTrigger>
        </TabsList>
        <TabsContent value="net" className="pt-2">
          {renderTable(sortedNet)}
        </TabsContent>
        <TabsContent value="gross" className="pt-2">
          {renderTable(sortedGross)}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EventLeaderboard;
