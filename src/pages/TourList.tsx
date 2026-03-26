import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Trophy, Plus, Calendar } from "lucide-react";
import AppHeader from "@/components/AppHeader";
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

  const { data: tours, isLoading, refetch } = useQuery({
    queryKey: ["tours"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tours")
        .select("*, clubs!tours_organizer_club_id_fkey(name, logo_url)")
        .order("year", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["all-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, courses(name, location)")
        .order("event_date", { ascending: false });
      if (error) throw error;
      return data;
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
      const participatingTours = (myTourPlayers ?? [])
        .filter(tp => !organizedIds.has(tp.tour_id))
        .map(tp => ({
          ...(tp.tours as any),
          playerRole: "participant",
          myStatus: tp.status,
          myTourHcp: tp.hcp_tour,
        }));

      return [...organizedTours, ...participatingTours];
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
                    <p className="text-sm font-semibold truncate">{tour.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {tour.year} · {(tour.clubs as any)?.name ?? "—"}
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
  );
};

export default TourList;
