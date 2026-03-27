import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Trophy, Plus, Calendar, Clock, MapPin, X } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import DesktopLayout from "@/components/DesktopLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import CreateTourDialog from "@/components/tour/CreateTourDialog";

const TourList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "completed">("upcoming");
  const [tourTab, setTourTab] = useState<"invited" | "mine" | "all">("mine");

  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // My upcoming tee time bookings
  const { data: myBookings, refetch: refetchBookings } = useQuery({
    queryKey: ["my-tee-bookings", userId],
    queryFn: async () => {
      if (!userId) return [];
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("tee_time_bookings")
        .select("*, courses(name, location)")
        .eq("user_id", userId)
        .gte("booking_date", today)
        .in("status", ["confirmed", "pending"])
        .order("booking_date", { ascending: true })
        .order("tee_time", { ascending: true });
      return data ?? [];
    },
    enabled: !!userId,
  });

  const { data: tours, isLoading, refetch } = useQuery({
    queryKey: ["tours", userId],
    queryFn: async () => {
      // Always fetch public tours
      const { data: publicTours, error } = await supabase
        .from("tours")
        .select("*, clubs!tours_organizer_club_id_fkey(name, logo_url)")
        .eq("is_public", true)
        .order("year", { ascending: false });
      if (error) throw error;

      if (!userId) return publicTours ?? [];

      // Also fetch private tours where user is a member of organizer club or a registered player
      const { data: memberClubs } = await supabase
        .from("members")
        .select("club_id")
        .eq("user_id", userId);
      const clubIds = (memberClubs ?? []).map(m => m.club_id);

      const { data: playerTours } = await supabase
        .from("tour_players")
        .select("tour_id")
        .eq("player_id", userId);
      const playerTourIds = (playerTours ?? []).map(t => t.tour_id);

      // Fetch private tours accessible to this user
      let privateTours: any[] = [];

      // Private tours where user is member of organizer club
      if (clubIds.length > 0) {
        const { data: orgTours } = await supabase
          .from("tours")
          .select("*, clubs!tours_organizer_club_id_fkey(name, logo_url)")
          .eq("is_public", false)
          .in("organizer_club_id", clubIds)
          .order("year", { ascending: false });
        privateTours = [...privateTours, ...(orgTours ?? [])];
      }

      // Private tours where user is a registered player
      if (playerTourIds.length > 0) {
        const { data: playerPrivateTours } = await supabase
          .from("tours")
          .select("*, clubs!tours_organizer_club_id_fkey(name, logo_url)")
          .eq("is_public", false)
          .in("id", playerTourIds)
          .order("year", { ascending: false });
        privateTours = [...privateTours, ...(playerPrivateTours ?? [])];
      }

      // Merge — deduplicate by id (use a Map to guarantee uniqueness)
      const tourMap = new Map<string, any>();
      (publicTours ?? []).forEach(t => tourMap.set(t.id, t));
      privateTours.forEach(t => { if (!tourMap.has(t.id)) tourMap.set(t.id, t); });
      return Array.from(tourMap.values());
    },
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["all-events", userId],
    queryFn: async () => {
      // Only show events from public tours
      // (private tour events handled separately via myEvents)
      const { data, error } = await supabase
        .from("events")
        .select("*, courses(name, location), tours!inner(is_public)")
        .eq("tours.is_public", true)
        .order("event_date", { ascending: false });
      if (error) throw error;

      // If user is logged in, also include events from private tours they have access to
      if (!userId) return data ?? [];

      // Get private tour IDs the user can access
      const { data: memberClubs } = await supabase
        .from("members").select("club_id").eq("user_id", userId);
      const clubIds = (memberClubs ?? []).map(m => m.club_id);

      const { data: playerTours } = await supabase
        .from("tour_players").select("tour_id").eq("player_id", userId);
      const playerTourIds = (playerTours ?? []).map(t => t.tour_id);

      let privateEvents: any[] = [];

      if (clubIds.length > 0) {
        const { data: orgPrivateTourIds } = await supabase
          .from("tours")
          .select("id")
          .eq("is_public", false)
          .in("organizer_club_id", clubIds);
        const ids = (orgPrivateTourIds ?? []).map(t => t.id);
        if (ids.length > 0) {
          const { data: pe } = await supabase
            .from("events")
            .select("*, courses(name, location), tours(is_public)")
            .in("tour_id", ids)
            .order("event_date", { ascending: false });
          privateEvents = [...privateEvents, ...(pe ?? [])];
        }
      }

      if (playerTourIds.length > 0) {
        const { data: playerPrivateTourIds } = await supabase
          .from("tours")
          .select("id")
          .eq("is_public", false)
          .in("id", playerTourIds);
        const ids = (playerPrivateTourIds ?? []).map(t => t.id);
        if (ids.length > 0) {
          const { data: pe } = await supabase
            .from("events")
            .select("*, courses(name, location), tours(is_public)")
            .in("tour_id", ids)
            .order("event_date", { ascending: false });
          privateEvents = [...privateEvents, ...(pe ?? [])];
        }
      }

      // Merge & deduplicate
      const allEvents = [...(data ?? [])];
      const publicEventIds = new Set(allEvents.map(e => e.id));
      privateEvents.forEach(e => { if (!publicEventIds.has(e.id)) allEvents.push(e); });
      return allEvents;
    },
  });

  const { data: invitedTours } = useQuery({
    queryKey: ["invited-tours", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data: myClubs } = await supabase
        .from("members")
        .select("club_id")
        .eq("user_id", userId)
        .in("role", ["owner", "admin"]);

      if (!myClubs?.length) return [];
      const myClubIds = [...new Set(myClubs.map(m => m.club_id))];

      const { data } = await supabase
        .from("tour_clubs")
        .select("*, tours(*, clubs!tours_organizer_club_id_fkey(name))")
        .in("club_id", myClubIds)
        .eq("status", "invited");

      return data ?? [];
    },
    enabled: !!userId,
  });

  const { data: myTours } = useQuery({
    queryKey: ["my-tours", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data: myAdminClubs } = await supabase
        .from("members")
        .select("club_id")
        .eq("user_id", userId)
        .in("role", ["owner", "admin"]);

      const myClubIds = [...new Set(
        (myAdminClubs ?? []).map(m => m.club_id)
      )];

      let organizedTours: any[] = [];
      if (myClubIds.length > 0) {
        const { data } = await supabase
          .from("tours")
          .select("*, clubs!tours_organizer_club_id_fkey(name, logo_url)")
          .in("organizer_club_id", myClubIds)
          .order("year", { ascending: false });
        organizedTours = (data ?? []).map(t => ({
          ...t, playerRole: "organizer"
        }));
      }

      const { data: myTourPlayers } = await supabase
        .from("tour_players")
        .select("tour_id, status, hcp_tour, tours(*, clubs!tours_organizer_club_id_fkey(name, logo_url))")
        .eq("player_id", userId)
        .in("status", ["registered", "active", "pending"]);

      const organizedIds = new Set(organizedTours.map(t => t.id));
      // Deduplicate tour_players by tour_id (a user can have multiple entries)
      const seenTourIds = new Set<string>();
      const participatingTours = (myTourPlayers ?? [])
        .filter(tp => {
          if (organizedIds.has(tp.tour_id)) return false;
          if (seenTourIds.has(tp.tour_id)) return false;
          seenTourIds.add(tp.tour_id);
          return true;
        })
        .map(tp => ({
          ...(tp.tours as any),
          playerRole: "participant",
          myStatus: tp.status,
          myTourHcp: tp.hcp_tour,
        }));

      // Final dedup using Map (in case organizedTours and participatingTours overlap)
      const myTourMap = new Map<string, any>();
      organizedTours.forEach(t => myTourMap.set(t.id, t));
      participatingTours.forEach(t => { if (!myTourMap.has(t.id)) myTourMap.set(t.id, t); });
      return Array.from(myTourMap.values());
    },
    enabled: !!userId,
  });

  const isOrganizer = myTours?.some(t => t.playerRole === "organizer");

  const { data: myEvents } = useQuery({
    queryKey: ["my-events-as-player", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from("contestants")
        .select("*, events(id, name, event_date, status, courses(name), tours(name))")
        .eq("player_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!userId,
  });

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Batalkan booking ini?")) return;
    const { error } = await supabase
      .from("tee_time_bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId)
      .eq("user_id", userId!);
    if (error) { return; }
    refetchBookings();
  };

  const upcomingEvents = events?.filter(e =>
    e.status !== "completed" && e.status !== "cancelled"
  ) ?? [];

  const completedEvents = events?.filter(e =>
    e.status === "completed"
  ) ?? [];

  const displayEvents = tab === "upcoming" ? upcomingEvents : completedEvents;

  const eventTabs = [
    { id: "upcoming" as const, label: "Upcoming" },
    { id: "completed" as const, label: "Completed" },
  ];

  const tourTabs = [
    { id: "invited" as const, label: "Invited", count: invitedTours?.length },
    { id: "mine" as const, label: isOrganizer ? "My Tours" : "My Events", count: isOrganizer ? myTours?.length : myEvents?.length },
    { id: "all" as const, label: "All" },
  ];

  return (
    <DesktopLayout>
    <div className="bottom-nav-safe">
      <AppHeader
        title="Play"
        icon={<Trophy className="h-5 w-5 text-primary" />}
      />

      {/* ═══ SECTION 1: EVENTS ═══ */}
      <div className="mx-4 golf-card overflow-hidden">
        <div className="flex">
          {eventTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
          {eventsLoading && Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}

          {!eventsLoading && displayEvents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-semibold">
                {tab === "upcoming" ? "Tidak ada event mendatang" : "Belum ada event selesai"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Event akan muncul setelah dibuat oleh organizer</p>
            </div>
          )}

          {displayEvents.map((event, i) => (
            <div
              key={event.id}
              className="flex items-center gap-3 rounded-lg bg-background/50 p-3 animate-fade-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <Avatar className="h-9 w-9 border border-primary/20">
                <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                  {event.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{event.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {event.event_date} · {(event.courses as any)?.name ?? ""}
                </p>
              </div>
              <Badge
                variant={event.status === "completed" ? "secondary" : "outline"}
                className="text-[9px] shrink-0"
              >
                {event.status}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                className="h-7 rounded-lg border-primary/30 px-3 text-[10px] font-bold uppercase tracking-wider text-primary"
                onClick={() => navigate(`/event/${event.id}`)}
              >
                View
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ MY TEE TIMES ═══ */}
      {userId && (myBookings?.length ?? 0) > 0 && (
        <div className="mt-4 px-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">My Tee Times</h2>
            <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
              {myBookings?.length} upcoming
            </span>
          </div>
          <div className="space-y-2">
            {myBookings?.map((b: any) => (
              <div key={b.id} className="golf-card p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {(b.courses as any)?.name ?? "Golf Course"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Calendar className="h-3 w-3" /> {b.booking_date}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="h-3 w-3" /> {b.tee_time?.slice(0, 5)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {b.players_count} player{b.players_count > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge
                    variant="outline"
                    className={`text-[9px] ${b.status === "confirmed"
                      ? "text-green-500 border-green-500/30 bg-green-500/5"
                      : "text-amber-500 border-amber-500/30"}`}
                  >
                    {b.status}
                  </Badge>
                  <button
                    onClick={() => handleCancelBooking(b.id)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Cancel booking"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ SECTION 2: TOURNAMENTS ═══ */}
      <div className="mt-6 px-4">
        <div className="flex items-center gap-3 mb-3">
          {tourTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTourTab(t.id)}
              className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                tourTab === t.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {t.count != null && t.count > 0 && (
                <span className="ml-1 text-primary">({t.count})</span>
              )}
            </button>
          ))}
          <button
            onClick={() => setShowCreate(true)}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Tab: Invited */}
          {tourTab === "invited" && (
            invitedTours?.length === 0
              ? <p className="text-xs text-muted-foreground text-center py-4">
                  No pending invitations
                </p>
              : invitedTours?.map((tc: any) => {
                  const tour = tc.tours;
                  return (
                    <div key={tc.id} className="golf-card p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{tour?.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {tour?.year} · By {tour?.clubs?.name}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 text-xs"
                          onClick={async () => {
                            await supabase.from("tour_clubs")
                              .update({ status: "accepted" }).eq("id", tc.id);
                            queryClient.invalidateQueries({ queryKey: ["invited-tours"] });
                            navigate(`/tour/${tour?.id}`);
                          }}>
                          Accept
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          onClick={async () => {
                            await supabase.from("tour_clubs")
                              .update({ status: "declined" }).eq("id", tc.id);
                            queryClient.invalidateQueries({ queryKey: ["invited-tours"] });
                          }}>
                          Decline
                        </Button>
                      </div>
                    </div>
                  );
                })
          )}

          {/* Tab: My Tours / My Events */}
          {tourTab === "mine" && (
            isOrganizer ? (
              myTours?.filter(t => t.playerRole === "organizer").length === 0
                ? <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Trophy className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-semibold">No tournaments yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Buat tournament baru untuk memulai</p>
                    <Button size="sm" className="mt-3" onClick={() => setShowCreate(true)}>Buat Tournament</Button>
                  </div>
                : myTours?.filter(t => t.playerRole === "organizer").map((tour: any, i: number) => (
                    <button key={tour.id}
                      onClick={() => navigate(`/tour/${tour.id}`)}
                      className="flex w-full items-center gap-3 rounded-xl py-3 text-left hover:opacity-80 transition-opacity animate-fade-in"
                      style={{ animationDelay: `${i * 60}ms` }}>
                      <Avatar className="h-10 w-10 border-2 border-primary/20">
                        <AvatarImage src={tour.clubs?.logo_url ?? ""} />
                        <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                          {tour.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{tour.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {tour.year} · {tour.clubs?.name ?? "—"}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[9px] text-primary border-primary/30">
                        Organizer →
                      </Badge>
                    </button>
                  ))
            ) : (
              myEvents?.length === 0
                ? <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Trophy className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-semibold">Belum mengikuti tournament</p>
                    <p className="text-xs text-muted-foreground mt-1">Daftar ke tournament atau buat tournament baru</p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => setTourTab("all")}>Browse All</Button>
                  </div>
                : myEvents?.map((c: any, i: number) => {
                    const ev = c.events;
                    if (!ev) return null;
                    const statusColors: Record<string, string> = {
                      draft: "text-muted-foreground border-muted-foreground/30",
                      registration: "text-accent-foreground border-accent/30",
                      playing: "text-primary border-primary/30",
                      completed: "text-primary border-primary/60",
                    };
                    return (
                      <button key={c.id}
                        onClick={() => navigate(`/event/${ev.id}`)}
                        className="flex w-full items-center gap-3 rounded-xl py-3 text-left hover:opacity-80 transition-opacity animate-fade-in"
                        style={{ animationDelay: `${i * 60}ms` }}>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary border-2 border-primary/20">
                          {ev.name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{ev.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {ev.event_date} · {(ev.courses as any)?.name ?? "—"}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60">
                            {(ev.tours as any)?.name ?? ""}
                          </p>
                        </div>
                        <Badge variant="outline"
                          className={`text-[9px] shrink-0 ${statusColors[ev.status] ?? ""}`}>
                          {ev.status}
                        </Badge>
                      </button>
                    );
                  })
            )
          )}

          {/* Tab: All */}
          {tourTab === "all" && (
            <>
              {isLoading && Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}

              {!isLoading && tours?.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Trophy className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-semibold">No tournaments yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Tournament akan muncul setelah dibuat</p>
                </div>
              )}

              {tours?.map((tour, i) => (
                <button
                  key={tour.id}
                  onClick={() => navigate(`/tour/${tour.id}`)}
                  className="flex w-full items-center gap-3 rounded-xl py-3 text-left animate-fade-in transition-colors hover:opacity-80"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <Avatar className="h-10 w-10 border-2 border-primary/20">
                    <AvatarImage src={(tour.clubs as any)?.logo_url ?? ""} />
                    <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                      {tour.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold truncate">{tour.name}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                        (tour as any).is_public === false
                          ? "text-amber-500 bg-amber-500/10 border-amber-500/30"
                          : "text-primary/70 bg-primary/10 border-primary/20"
                      }`}>
                        {(tour as any).is_public === false ? "🔒 Private" : "🌐 Public"}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {tour.year} · {(tour.clubs as any)?.name ?? "—"} · {tour.tournament_type}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-lg px-4 text-[10px] font-bold uppercase tracking-wider"
                  >
                    View →
                  </Button>
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      <CreateTourDialog open={showCreate} onOpenChange={setShowCreate} onCreated={() => { setShowCreate(false); refetch(); }} />
    </div>
    </DesktopLayout>
  );
};

export default TourList;
