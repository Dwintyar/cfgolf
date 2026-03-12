import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, Users, Ticket, Trophy, Award, Shuffle, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import AssignContestantDialog from "@/components/tour/AssignContestantDialog";

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showAssign, setShowAssign] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [startType, setStartType] = useState("tee_time");
  const [firstTee, setFirstTee] = useState("07:00");
  const [interval, setInterval] = useState("8");

  const { data: event, isLoading } = useQuery({
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

  const { data: results } = useQuery({
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

  const { data: pairings, refetch: refetchPairings } = useQuery({
    queryKey: ["event-pairings", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pairings")
        .select("*, pairing_players(*, contestants(*, profiles(full_name, handicap)))")
        .eq("event_id", id!)
        .order("group_number");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleGeneratePairings = async () => {
    if (!id) return;
    setGenerating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const { data, error } = await supabase.functions.invoke("generate-event-pairings", {
        body: {
          event_id: id,
          start_type: startType,
          first_tee_time: firstTee,
          interval_minutes: parseInt(interval) || 8,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (error) {
        toast.error(error.message || "Failed to generate pairings");
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(`Generated ${data.groups_created} groups for ${data.total_players} players`);
        refetchPairings();
      }
    } catch (err: any) {
      toast.error(err.message || "Unexpected error");
    } finally {
      setGenerating(false);
    }
  };

  const statusColors: Record<string, string> = {
    draft: "border-muted-foreground/30 text-muted-foreground",
    registration: "border-accent/40 text-accent",
    checkin: "border-accent/40 text-accent",
    playing: "border-primary/40 text-primary",
    completed: "border-primary/60 text-primary",
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
  const totalTickets = tickets?.length ?? 0;

  const formatTeeTime = (teeTime: string | null) => {
    if (!teeTime) return "—";
    try {
      const d = new Date(teeTime);
      return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    } catch {
      return teeTime;
    }
  };

  return (
    <div className="bottom-nav-safe">
      <div className="p-4">
        <button onClick={() => navigate(`/tour/${(event.tours as any)?.id}`)} className="mb-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← {(event.tours as any)?.name}
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-xl font-bold">{event.name}</h1>
            <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {event.event_date}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {(event.courses as any)?.name}</span>
            </div>
          </div>
          <Badge variant="outline" className={`text-[10px] ${statusColors[event.status] ?? ""}`}>
            {event.status}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 px-4 pb-3">
        <div className="golf-card p-3 text-center">
          <Users className="mx-auto h-4 w-4 text-primary" />
          <p className="mt-1 text-lg font-bold">{contestants?.length ?? 0}</p>
          <p className="text-[10px] text-muted-foreground">Players</p>
        </div>
        <div className="golf-card p-3 text-center">
          <Ticket className="mx-auto h-4 w-4 text-accent" />
          <p className="mt-1 text-lg font-bold">{usedTickets}/{totalTickets}</p>
          <p className="text-[10px] text-muted-foreground">Tickets</p>
        </div>
        <div className="golf-card p-3 text-center">
          <Trophy className="mx-auto h-4 w-4 text-primary" />
          <p className="mt-1 text-lg font-bold">{(event.courses as any)?.par ?? "—"}</p>
          <p className="text-[10px] text-muted-foreground">Course Par</p>
        </div>
      </div>

      {/* Admin */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-none">
        <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1 text-[11px]" onClick={() => setShowAssign(true)}>
          <Users className="h-3 w-3" /> Assign Contestant
        </Button>
        <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1 text-[11px]" onClick={() => navigate(`/event/${id}/pairings`)}>
          <Shuffle className="h-3 w-3" /> View Pairings
        </Button>
      </div>

      <Tabs defaultValue="contestants" className="px-4">
        <TabsList className="w-full">
          <TabsTrigger value="contestants" className="flex-1 text-xs">Contestants</TabsTrigger>
          <TabsTrigger value="pairings" className="flex-1 text-xs">Pairings</TabsTrigger>
          <TabsTrigger value="tickets" className="flex-1 text-xs">Tickets</TabsTrigger>
          <TabsTrigger value="results" className="flex-1 text-xs">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="contestants" className="space-y-2 pt-2">
          {contestants?.length === 0 && (
            <div className="golf-card p-6 text-center text-sm text-muted-foreground">No contestants yet</div>
          )}
          {contestants?.map((c) => (
            <div key={c.id} className="golf-card flex items-center gap-3 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {(c.profiles as any)?.full_name?.charAt(0) ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{(c.profiles as any)?.full_name ?? "Unknown"}</p>
                <p className="text-xs text-muted-foreground">
                  HCP {c.hcp ?? "—"} · {(c.tournament_flights as any)?.flight_name ?? "No flight"}
                </p>
              </div>
              <Badge variant="outline" className={`text-[10px] ${c.status === "competitor" ? "text-primary border-primary/30" : c.status === "guest" ? "text-accent border-accent/30" : "text-muted-foreground"}`}>
                {c.status}
              </Badge>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="pairings" className="space-y-3 pt-2">
          {/* Generate Pairings Controls */}
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
              {generating ? "Generating…" : "Generate Pairings"}
            </Button>
          </div>

          {/* Pairing list */}
          {(!pairings || pairings.length === 0) && (
            <div className="golf-card p-6 text-center text-sm text-muted-foreground">
              No pairings generated yet. Use the controls above to generate.
            </div>
          )}
          {pairings?.map((p) => (
            <div key={p.id} className="golf-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Group {p.group_number}</span>
                <div className="flex items-center gap-2">
                  {p.start_type === "shotgun" && p.start_hole && (
                    <Badge variant="outline" className="text-[10px] border-accent/30 text-accent">Hole {p.start_hole}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{formatTeeTime(p.tee_time)}</span>
                </div>
              </div>
              <div className="space-y-1">
                {((p.pairing_players as any[]) ?? [])
                  .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
                  .map((pp: any) => (
                    <div key={pp.id} className="flex items-center gap-2 text-xs">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {pp.position}
                      </span>
                      <span className="truncate">{pp.contestants?.profiles?.full_name ?? "Unknown"}</span>
                      <span className="ml-auto text-muted-foreground">HCP {pp.contestants?.hcp ?? "—"}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="tickets" className="space-y-2 pt-2">
          {tickets?.length === 0 && (
            <div className="golf-card p-6 text-center text-sm text-muted-foreground">No tickets allocated</div>
          )}
          {tickets?.map((t) => (
            <div key={t.id} className="golf-card flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium">#{t.ticket_number} · {(t.clubs as any)?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.assigned_player_id ? (t.profiles as any)?.full_name : "Unassigned"}
                </p>
              </div>
              <Badge variant="outline" className={`text-[10px] ${t.status === "available" ? "text-primary border-primary/30" : t.status === "assigned" ? "text-accent border-accent/30" : "text-muted-foreground"}`}>
                {t.status}
              </Badge>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="results" className="space-y-2 pt-2">
          {results?.length === 0 && (
            <div className="golf-card p-6 text-center text-sm text-muted-foreground">No results yet</div>
          )}
          {results?.map((r) => (
            <div key={r.id} className="golf-card flex items-center gap-3 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                #{r.rank_position}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{(r.contestants as any)?.profiles?.full_name ?? "Unknown"}</p>
                <p className="text-xs text-muted-foreground">
                  {(r.tournament_winner_categories as any)?.category_name} · {r.score_value} ({(r.tournament_winner_categories as any)?.calculation_type})
                </p>
              </div>
              <Award className="h-4 w-4 text-accent" />
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <AssignContestantDialog eventId={event.id} tourId={event.tour_id} open={showAssign} onOpenChange={setShowAssign} onDone={() => { setShowAssign(false); refetchContestants(); }} />
    </div>
  );
};

export default EventDetail;
