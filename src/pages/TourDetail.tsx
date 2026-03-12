import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Calendar, Users, MapPin, ChevronRight, Settings, UserPlus, Layers, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import InviteClubDialog from "@/components/tour/InviteClubDialog";
import RegisterPlayerDialog from "@/components/tour/RegisterPlayerDialog";
import ManageFlightsDialog from "@/components/tour/ManageFlightsDialog";
import ManageCategoriesDialog from "@/components/tour/ManageCategoriesDialog";
import CreateEventDialog from "@/components/tour/CreateEventDialog";

const TourDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showInvite, setShowInvite] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showFlights, setShowFlights] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);

  const { data: tour, isLoading } = useQuery({
    queryKey: ["tour", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tours")
        .select("*, clubs!tours_organizer_club_id_fkey(name, logo_url)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: events, refetch: refetchEvents } = useQuery({
    queryKey: ["tour-events", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, courses(name, location)")
        .eq("tour_id", id!)
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: tourClubs, refetch: refetchClubs } = useQuery({
    queryKey: ["tour-clubs", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tour_clubs")
        .select("*, clubs(name, logo_url)")
        .eq("tour_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: players, refetch: refetchPlayers } = useQuery({
    queryKey: ["tour-players", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tour_players")
        .select("*, profiles(full_name, avatar_url, handicap), clubs(name)")
        .eq("tour_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: flights } = useQuery({
    queryKey: ["tour-flights", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_flights")
        .select("*")
        .eq("tour_id", id!)
        .order("display_order");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

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

  if (!tour) return (
    <div className="bottom-nav-safe p-4 text-center text-muted-foreground">Tour not found</div>
  );

  return (
    <div className="bottom-nav-safe">
      {/* Header */}
      <div className="p-4">
        <button onClick={() => navigate("/tour")} className="mb-2 text-xs text-muted-foreground hover:text-foreground transition-colors">← All Tours</button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-xl font-bold">{tour.name}</h1>
            <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {tour.year}</span>
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {(tour.clubs as any)?.name}</span>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-primary/30 text-primary">
            {tour.tournament_type}
          </Badge>
        </div>
        {tour.description && <p className="mt-2 text-xs text-muted-foreground">{tour.description}</p>}
      </div>

      {/* Admin Actions */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-none">
        {tour.tournament_type === "interclub" && (
          <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1 text-[11px]" onClick={() => setShowInvite(true)}>
            <UserPlus className="h-3 w-3" /> Invite Club
          </Button>
        )}
        <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1 text-[11px]" onClick={() => setShowRegister(true)}>
          <UserPlus className="h-3 w-3" /> Register Player
        </Button>
        <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1 text-[11px]" onClick={() => setShowFlights(true)}>
          <Layers className="h-3 w-3" /> Flights
        </Button>
        <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1 text-[11px]" onClick={() => setShowCategories(true)}>
          <Award className="h-3 w-3" /> Categories
        </Button>
        <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1 text-[11px]" onClick={() => setShowCreateEvent(true)}>
          <Calendar className="h-3 w-3" /> New Event
        </Button>
      </div>

      <Tabs defaultValue="events" className="px-4">
        <TabsList className="w-full">
          <TabsTrigger value="events" className="flex-1 text-xs">Events ({events?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="players" className="flex-1 text-xs">Players ({players?.length ?? 0})</TabsTrigger>
          {tour.tournament_type === "interclub" && (
            <TabsTrigger value="clubs" className="flex-1 text-xs">Clubs ({tourClubs?.length ?? 0})</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="events" className="space-y-3 pt-2">
          {events?.length === 0 && (
            <div className="golf-card p-6 text-center text-sm text-muted-foreground">No events scheduled</div>
          )}
          {events?.map((event, i) => (
            <button
              key={event.id}
              onClick={() => navigate(`/event/${event.id}`)}
              className="golf-card w-full text-left p-4 animate-fade-in transition-all hover:border-primary/30"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-sm font-semibold truncate">{event.name}</h3>
                  <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {event.event_date}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {(event.courses as any)?.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] ${statusColors[event.status] ?? ""}`}>
                    {event.status}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </button>
          ))}
        </TabsContent>

        <TabsContent value="players" className="space-y-2 pt-2">
          {players?.length === 0 && (
            <div className="golf-card p-6 text-center text-sm text-muted-foreground">No players registered</div>
          )}
          {players?.map((p) => (
            <div key={p.id} className="golf-card flex items-center gap-3 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {(p.profiles as any)?.full_name?.charAt(0) ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{(p.profiles as any)?.full_name ?? "Unknown"}</p>
                <p className="text-xs text-muted-foreground">{(p.clubs as any)?.name} · HCP {(p.profiles as any)?.handicap ?? "—"}</p>
              </div>
              <Badge variant="outline" className={`text-[10px] ${p.status === "active" ? "text-primary border-primary/30" : "text-muted-foreground"}`}>
                {p.status}
              </Badge>
            </div>
          ))}
        </TabsContent>

        {tour.tournament_type === "interclub" && (
          <TabsContent value="clubs" className="space-y-2 pt-2">
            {tourClubs?.length === 0 && (
              <div className="golf-card p-6 text-center text-sm text-muted-foreground">No clubs invited</div>
            )}
            {tourClubs?.map((tc) => (
              <div key={tc.id} className="golf-card flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-medium">{(tc.clubs as any)?.name}</p>
                  <p className="text-xs text-muted-foreground">Quota: {tc.ticket_quota} tickets</p>
                </div>
                <Badge variant="outline" className={`text-[10px] ${tc.status === "accepted" ? "text-primary border-primary/30" : "text-accent border-accent/30"}`}>
                  {tc.status}
                </Badge>
              </div>
            ))}
          </TabsContent>
        )}
      </Tabs>

      {/* Dialogs */}
      {tour.tournament_type === "interclub" && (
        <InviteClubDialog tourId={tour.id} open={showInvite} onOpenChange={setShowInvite} onDone={() => { setShowInvite(false); refetchClubs(); }} />
      )}
      <RegisterPlayerDialog tourId={tour.id} tourType={tour.tournament_type!} organizerClubId={tour.organizer_club_id} open={showRegister} onOpenChange={setShowRegister} onDone={() => { setShowRegister(false); refetchPlayers(); }} />
      <ManageFlightsDialog tourId={tour.id} open={showFlights} onOpenChange={setShowFlights} />
      <ManageCategoriesDialog tourId={tour.id} open={showCategories} onOpenChange={setShowCategories} />
      <CreateEventDialog tourId={tour.id} open={showCreateEvent} onOpenChange={setShowCreateEvent} onDone={() => { setShowCreateEvent(false); refetchEvents(); }} />
    </div>
  );
};

export default TourDetail;
