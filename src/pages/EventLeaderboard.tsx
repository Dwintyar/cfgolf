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
        .select("*, courses(name, location, par), tours(name, id)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: leaderboard, isLoading: loadingLb } = useQuery({
    queryKey: ["event-leaderboard", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_leaderboard")
        .select("*")
        .eq("event_id", id!)
        .eq("status", "competitor");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    refetchInterval: 15000, // auto-refresh every 15s for "live" feel
  });

  const { data: flights } = useQuery({
    queryKey: ["event-tour-flights", event?.tour_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_flights")
        .select("*")
        .eq("tour_id", event!.tour_id)
        .order("display_order");
      if (error) throw error;
      return data;
    },
    enabled: !!event?.tour_id,
  });

  const { data: profiles } = useQuery({
    queryKey: ["leaderboard-profiles", id],
    queryFn: async () => {
      if (!leaderboard) return {};
      const playerIds = [...new Set(leaderboard.map((r: any) => r.player_id))];
      if (playerIds.length === 0) return {};
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", playerIds);
      const map: Record<string, any> = {};
      data?.forEach((p: any) => { map[p.id] = p; });
      return map;
    },
    enabled: !!leaderboard && leaderboard.length > 0,
  });

  const flightMap: Record<string, string> = {};
  flights?.forEach((f: any) => { flightMap[f.id] = f.flight_name; });

  const sortedNet = [...(leaderboard ?? [])].sort((a: any, b: any) => a.total_net - b.total_net);
  const sortedGross = [...(leaderboard ?? [])].sort((a: any, b: any) => a.total_gross - b.total_gross);

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

  const renderTable = (rows: any[]) => (
    <div className="space-y-1">
      {/* Header */}
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
      {rows.map((r: any, idx: number) => {
        const profile = profiles?.[r.player_id];
        const flightName = r.flight_id ? flightMap[r.flight_id] : null;
        return (
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
                {profile?.full_name?.charAt(0) ?? "?"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{profile?.full_name ?? "Unknown"}</p>
                <p className="text-[10px] text-muted-foreground">HCP {r.hcp ?? "—"}</p>
              </div>
            </div>
            <div>
              {flightName ? (
                <Badge variant="outline" className="text-[9px] border-primary/20 text-primary">{flightName}</Badge>
              ) : (
                <span className="text-[10px] text-muted-foreground">—</span>
              )}
            </div>
            <span className="text-right text-sm tabular-nums font-medium">{r.total_gross || "—"}</span>
            <span className="text-right text-sm tabular-nums font-bold text-primary">{r.total_net || "—"}</span>
          </div>
        );
      })}
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
          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {leaderboard?.length ?? 0} players</span>
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
