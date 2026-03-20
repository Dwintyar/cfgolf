import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Trophy, ChevronDown } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  tourId: string;
}

const TourEventResults = ({ tourId }: Props) => {
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  // Get all events for this tour
  const { data: events } = useQuery({
    queryKey: ["tour-results-events", tourId],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, name, event_date, status")
        .eq("tour_id", tourId)
        .order("event_date", { ascending: false });
      return data ?? [];
    },
  });

  // Auto-select first event
  const effectiveEventId = selectedEventId || events?.[0]?.id || "";

  // Get flights for the tour
  const { data: flights } = useQuery({
    queryKey: ["tour-results-flights", tourId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournament_flights")
        .select("*")
        .eq("tour_id", tourId)
        .order("display_order");
      return data ?? [];
    },
  });

  // Get contestants + leaderboard for selected event
  const { data: contestants, isLoading } = useQuery({
    queryKey: ["event-results-contestants", effectiveEventId],
    queryFn: async () => {
      const { data } = await supabase
        .from("event_leaderboard")
        .select("contestant_id, player_id, total_gross, total_net, hcp, flight_id, rank_gross, rank_net")
        .eq("event_id", effectiveEventId);
      return data ?? [];
    },
    enabled: !!effectiveEventId,
  });

  // Get profiles for contestants
  const playerIds = [...new Set((contestants ?? []).map(c => c.player_id).filter(Boolean))] as string[];

  const { data: profiles } = useQuery({
    queryKey: ["event-results-profiles", playerIds],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", playerIds);
      const map: Record<string, any> = {};
      for (const p of data ?? []) map[p.id] = p;
      return map;
    },
    enabled: playerIds.length > 0,
  });

  // Get event_results for winner labels
  const { data: eventResults } = useQuery({
    queryKey: ["event-results-labels", effectiveEventId],
    queryFn: async () => {
      const { data } = await supabase
        .from("event_results")
        .select("contestant_id, rank_position, score_value, tournament_winner_categories(category_name)")
        .eq("event_id", effectiveEventId);
      return data ?? [];
    },
    enabled: !!effectiveEventId,
  });

  // Build result labels map: contestant_id -> labels[]
  const resultLabels: Record<string, string[]> = {};
  for (const r of eventResults ?? []) {
    if (!r.contestant_id) continue;
    const cat = (r.tournament_winner_categories as any)?.category_name ?? "";
    const label = cat ? `${cat} #${r.rank_position}` : `#${r.rank_position}`;
    if (!resultLabels[r.contestant_id]) resultLabels[r.contestant_id] = [];
    resultLabels[r.contestant_id].push(label);
  }

  // Group contestants by flight
  const grouped: Record<string, typeof contestants> = {};
  for (const c of contestants ?? []) {
    const key = c.flight_id ?? "none";
    if (!grouped[key]) grouped[key] = [];
    grouped[key]!.push(c);
  }

  // Sort each group by net ASC
  Object.values(grouped).forEach(group => {
    group!.sort((a, b) => (a.total_net ?? 999) - (b.total_net ?? 999));
  });

  const flightMap: Record<string, string> = {};
  for (const f of flights ?? []) flightMap[f.id] = f.flight_name;

  // Ordered flight sections
  const sections = flights?.length
    ? flights
        .filter(f => grouped[f.id]?.length)
        .map(f => ({ id: f.id, name: f.flight_name, players: grouped[f.id]! }))
    : grouped["none"]?.length
      ? [{ id: "none", name: "All Players", players: grouped["none"] }]
      : [];

  // Add ungrouped if flights exist but some contestants have no flight
  if (flights?.length && grouped["none"]?.length) {
    sections.push({ id: "none", name: "Unassigned", players: grouped["none"] });
  }

  const getInitials = (name: string | null) =>
    name ? name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() : "?";

  return (
    <div className="space-y-3 pt-2">
      {/* Event selector */}
      <Select value={effectiveEventId} onValueChange={setSelectedEventId}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder="Select event" />
        </SelectTrigger>
        <SelectContent>
          {events?.map(e => (
            <SelectItem key={e.id} value={e.id} className="text-xs">
              {e.name} — {new Date(e.event_date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
              {e.status === "completed" ? " ✓" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && sections.length === 0 && (
        <div className="golf-card p-6 text-center text-sm text-muted-foreground">
          No scores for this event yet
        </div>
      )}

      {sections.map((section) => (
        <div key={section.id} className="space-y-1">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            {section.name}
          </h4>
          <div className="golf-card overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[2rem_1fr_3rem_2.5rem_3rem_auto] gap-1 px-3 py-2 bg-muted/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span>#</span>
              <span>Name</span>
              <span className="text-center">Gross</span>
              <span className="text-center">HCP</span>
              <span className="text-center">Net</span>
              <span className="text-center">Result</span>
            </div>

            {section.players.map((c, i) => {
              const p = profiles?.[c.player_id ?? ""];
              const labels = resultLabels[c.contestant_id ?? ""] ?? [];
              const isWinner = labels.length > 0;

              return (
                <div
                  key={c.contestant_id}
                  className={`grid grid-cols-[2rem_1fr_3rem_2.5rem_3rem_auto] gap-1 items-center px-3 py-2.5 border-t border-border/30 ${isWinner ? "bg-primary/5" : ""}`}
                >
                  <span className="text-xs font-bold text-foreground flex items-center">
                    {isWinner && <Trophy className="h-3 w-3 text-yellow-500 mr-0.5" />}
                    {!isWinner && (i + 1)}
                  </span>
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarImage src={p?.avatar_url ?? ""} />
                      <AvatarFallback className="bg-secondary text-[8px] font-bold">
                        {getInitials(p?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-xs font-medium truncate">{p?.full_name ?? "Unknown"}</p>
                  </div>
                  <span className="text-center text-[11px]">{c.total_gross ?? "-"}</span>
                  <span className="text-center text-[11px] text-muted-foreground">{c.hcp ?? "-"}</span>
                  <span className="text-center text-[11px] font-bold text-primary">{c.total_net ?? "-"}</span>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {labels.map((label, li) => (
                      <Badge key={li} variant="outline" className="text-[9px] px-1.5 py-0 border-primary/30 text-primary">
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TourEventResults;
