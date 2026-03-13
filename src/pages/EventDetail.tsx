import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar, MapPin, Users, Ticket, Trophy, Award, Shuffle, TrendingDown,
  ClipboardCheck, Package, Lock, Car, UserCheck, ChevronRight
} from "lucide-react";
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
  const [calculating, setCalculating] = useState(false);
  const [updatingHcp, setUpdatingHcp] = useState(false);
  const [startType, setStartType] = useState("tee_time");
  const [firstTee, setFirstTee] = useState("07:00");
  const [interval, setInterval] = useState("8");
  const [activeTab, setActiveTab] = useState("overview");

  // --- Queries ---
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

  const { data: checkins } = useQuery({
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

  const { data: cartAssignments } = useQuery({
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

  const { data: caddyAssignments } = useQuery({
    queryKey: ["event-caddies", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caddy_assignments")
        .select("*, contestants(profiles(full_name)), profiles!caddy_assignments_caddy_id_fkey(full_name)")
        .eq("event_id", id!);
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

  const { data: leaderboard } = useQuery({
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

  const handleCalculateWinners = async () => {
    if (!id) return;
    setCalculating(true);
    try {
      const { data, error } = await invokeWithAuth("calculate-event-winners", { event_id: id });
      if (error) toast.error(error.message || "Failed");
      else if (data?.error) toast.error(data.error);
      else { toast.success(`Calculated ${data.winners_calculated} winners`); refetchResults(); }
    } catch (err: any) { toast.error(err.message); }
    finally { setCalculating(false); }
  };

  const handleUpdateHandicaps = async () => {
    if (!id) return;
    setUpdatingHcp(true);
    try {
      const { data, error } = await invokeWithAuth("update-player-handicap", { event_id: id });
      if (error) toast.error(error.message || "Failed");
      else if (data?.error) toast.error(data.error);
      else toast.success(`Updated ${data.players_updated} handicaps`);
    } catch (err: any) { toast.error(err.message); }
    finally { setUpdatingHcp(false); }
  };

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

  return (
    <div className="bottom-nav-safe">
      {/* Header */}
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
          <Badge variant="outline" className={`text-[10px] ${statusColors[event.status] ?? ""}`}>{event.status}</Badge>
        </div>
      </div>

      {/* Quick Stats */}
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
          <p className="text-base font-bold">{pairings?.length ?? 0}</p>
          <p className="text-[9px] text-muted-foreground">Groups</p>
        </div>
        <div className="golf-card p-2.5 text-center">
          <Trophy className="mx-auto h-3.5 w-3.5 text-accent" />
          <p className="text-base font-bold">{(event.courses as any)?.par ?? "—"}</p>
          <p className="text-[9px] text-muted-foreground">Par</p>
        </div>
      </div>

      {/* Admin Actions */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-none">
        <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1 text-[11px]" onClick={() => setShowAssign(true)}>
          <Users className="h-3 w-3" /> Assign
        </Button>
        <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1 text-[11px]" onClick={handleCalculateWinners} disabled={calculating}>
          <Award className="h-3 w-3" /> {calculating ? "…" : "Winners"}
        </Button>
        <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1 text-[11px]" onClick={handleUpdateHandicaps} disabled={updatingHcp}>
          <TrendingDown className="h-3 w-3" /> {updatingHcp ? "…" : "HCP Update"}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
        <TabsList className="w-full overflow-x-auto flex">
          <TabsTrigger value="overview" className="flex-1 text-[11px]">Overview</TabsTrigger>
          <TabsTrigger value="checkin" className="flex-1 text-[11px]">Check-in</TabsTrigger>
          <TabsTrigger value="pairings" className="flex-1 text-[11px]">Pairings</TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex-1 text-[11px]">Board</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4 pt-2">
          {/* Contestants */}
          <Section title="Contestants" icon={Users} count={contestants?.length}>
            {contestants?.length === 0 && <EmptyState text="No contestants" />}
            {contestants?.slice(0, 10).map((c) => (
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

          {/* Tickets */}
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

          {/* Results */}
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
        <TabsContent value="checkin" className="space-y-4 pt-2">
          {/* Check-ins */}
          <Section title="Check-ins" icon={ClipboardCheck} count={checkins?.length}>
            {checkins?.length === 0 && <EmptyState text="No check-ins yet" />}
            {checkins?.map((ci) => (
              <div key={ci.id} className="golf-card p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{(ci.contestants as any)?.profiles?.full_name ?? "Unknown"}</p>
                  <span className="text-[10px] text-muted-foreground">{new Date(ci.checked_in_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  {ci.bag_drop_number != null && (
                    <span className="flex items-center gap-1"><Package className="h-3 w-3" /> Bag #{ci.bag_drop_number}</span>
                  )}
                  {ci.locker_number != null && (
                    <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Locker #{ci.locker_number}</span>
                  )}
                </div>
                {ci.notes && <p className="text-[10px] text-muted-foreground/70">{ci.notes}</p>}
              </div>
            ))}
          </Section>

          {/* Cart Assignments */}
          <Section title="Golf Cart" icon={Car} count={cartAssignments?.length}>
            {cartAssignments?.length === 0 && <EmptyState text="No carts assigned" />}
            {cartAssignments?.map((ca) => (
              <div key={ca.id} className="golf-card flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{ca.cart_number}</div>
                  <p className="text-sm">{(ca.contestants as any)?.profiles?.full_name ?? "Unknown"}</p>
                </div>
              </div>
            ))}
          </Section>

          {/* Caddy Assignments */}
          <Section title="Caddy" icon={UserCheck} count={caddyAssignments?.length}>
            {caddyAssignments?.length === 0 && <EmptyState text="No caddies assigned" />}
            {caddyAssignments?.map((ca) => (
              <div key={ca.id} className="golf-card flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-medium">{(ca.contestants as any)?.profiles?.full_name ?? "Player"}</p>
                  <p className="text-xs text-muted-foreground">Caddy: {(ca.profiles as any)?.full_name ?? "Unknown"}</p>
                </div>
              </div>
            ))}
          </Section>
        </TabsContent>

        {/* PAIRINGS */}
        <TabsContent value="pairings" className="space-y-3 pt-2">
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
              <Shuffle className="h-3.5 w-3.5" /> {generating ? "Generating…" : "Generate Pairings"}
            </Button>
          </div>

          {(!pairings || pairings.length === 0) && <EmptyState text="No pairings generated yet" />}
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
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{pp.position}</span>
                      <span className="truncate">{pp.contestants?.profiles?.full_name ?? "Unknown"}</span>
                      <span className="ml-auto text-muted-foreground">HCP {pp.contestants?.hcp ?? "—"}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* LEADERBOARD */}
        <TabsContent value="leaderboard" className="space-y-2 pt-2">
          {(!leaderboard || leaderboard.length === 0) && <EmptyState text="No scores yet" />}
          {leaderboard?.map((row, i) => (
            <div key={row.contestant_id} className="golf-card flex items-center gap-3 p-3">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                i < 3 ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
              }`}>
                {row.rank_net ?? i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{(row as any).profiles?.full_name ?? "Player"}</p>
                <p className="text-xs text-muted-foreground">HCP {row.hcp ?? "—"}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold">{row.total_net ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground">Gross {row.total_gross ?? "—"}</p>
              </div>
            </div>
          ))}

          <Button variant="outline" size="sm" className="w-full mt-2 gap-1 text-xs" onClick={() => navigate(`/event/${id}/leaderboard`)}>
            <Trophy className="h-3.5 w-3.5" /> Full Leaderboard
          </Button>
        </TabsContent>
      </Tabs>

      <AssignContestantDialog eventId={event.id} tourId={event.tour_id} open={showAssign} onOpenChange={setShowAssign} onDone={() => { setShowAssign(false); refetchContestants(); }} />
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
