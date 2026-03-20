import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shuffle, Calendar, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const EventPairings = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: event, isLoading: loadingEvent } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, courses(name, location), tours(name, id)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: pairings, isLoading: loadingPairings } = useQuery({
    queryKey: ["event-pairings-full", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pairings")
        .select("*, pairing_players(*, contestants(*, profiles(full_name, handicap, avatar_url)))")
        .eq("event_id", id!)
        .order("teeoff_group_number");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const formatTeeTime = (teeTime: string | null) => {
    if (!teeTime) return "—";
    try {
      const d = new Date(teeTime);
      return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    } catch {
      return teeTime;
    }
  };

  const isLoading = loadingEvent || loadingPairings;

  if (isLoading) return (
    <div className="bottom-nav-safe space-y-4 p-4">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-xl" />
      ))}
    </div>
  );

  if (!event) return (
    <div className="bottom-nav-safe p-4 text-center text-muted-foreground">Event not found</div>
  );

  return (
    <div className="bottom-nav-safe">
      {/* Header */}
      <div className="p-4">
        <button onClick={() => navigate(`/event/${id}`)} className="mb-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← {event.name}
        </button>
        <div className="flex items-center gap-2">
          <Shuffle className="h-5 w-5 text-primary" />
          <h1 className="font-display text-xl font-bold">Pairings</h1>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {event.event_date}</span>
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {(event.courses as any)?.name}</span>
          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {pairings?.length ?? 0} groups</span>
        </div>
      </div>

      {/* Pairings List */}
      <div className="space-y-3 px-4 pb-4">
        {(!pairings || pairings.length === 0) && (
          <div className="golf-card p-8 text-center">
            <Shuffle className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">No pairings generated yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Go back to the event page to generate pairings</p>
          </div>
        )}

        {pairings?.map((p, i) => {
          const players = ((p.pairing_players as any[]) ?? []).sort(
            (a: any, b: any) => (a.position ?? 0) - (b.position ?? 0)
          );

          return (
            <div
              key={p.id}
              className="golf-card p-4 space-y-3 animate-fade-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Group header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                    {p.group_number}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Group {p.group_number}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {players.length} players
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-medium tabular-nums">{formatTeeTime(p.tee_time)}</span>
                  {p.start_type === "shotgun" && p.start_hole && (
                    <Badge variant="outline" className="text-[10px] border-accent/30 text-accent">
                      Hole {p.start_hole}
                    </Badge>
                  )}
                  {p.start_type === "tee_time" && (
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                      Tee Time
                    </Badge>
                  )}
                </div>
              </div>

              {/* Players */}
              <div className="space-y-2 border-t border-border/30 pt-3">
                {players.map((pp: any) => {
                  const profile = pp.contestants?.profiles;
                  const hcp = pp.contestants?.hcp;
                  return (
                    <div key={pp.id} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
                        {pp.position}
                      </span>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {profile?.full_name?.charAt(0) ?? "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{profile?.full_name ?? "Unknown"}</p>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">HCP {hcp ?? "—"}</span>
                      {pp.cart_number && (
                        <Badge variant="outline" className="text-[10px]">Cart {pp.cart_number}</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EventPairings;
