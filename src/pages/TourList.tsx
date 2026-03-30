import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Trophy, Plus, Calendar, MapPin } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import DesktopLayout from "@/components/DesktopLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";

const TourList = ({ embedded = false }: { embedded?: boolean }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"upcoming" | "done">("upcoming");

  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

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
        .select("*, courses(name, location), tours!inner(is_public, organizer_club_id, clubs!tours_organizer_club_id_fkey(is_personal))")
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
            .select("*, courses(name, location), tours(is_public, organizer_club_id, clubs!tours_organizer_club_id_fkey(is_personal))")
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
            .select("*, courses(name, location), tours(is_public, organizer_club_id, clubs!tours_organizer_club_id_fkey(is_personal))")
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

  const upcomingEvents = (events?.filter(e =>
    e.status !== "done" && e.status !== "cancelled"
  ) ?? []).sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

  const completedEvents = events?.filter(e =>
    e.status === "done"
  ) ?? [];

  const displayEvents = tab === "upcoming" ? upcomingEvents : completedEvents;

  const eventTabs = [
    { id: "upcoming" as const, label: "Upcoming" },
    { id: "done" as const, label: "Done" },
  ];

  const tourTabs = [
    { id: "invited" as const, label: "Invited", count: invitedTours?.length },
    { id: "mine" as const, label: "My Tours", count: myTours?.length ?? 0 },
    { id: "all" as const, label: "All" },
  ];

  const content = (
    <div className="bottom-nav-safe">
      {!embedded && <AppHeader
        title="Rounds"
        icon={<Trophy className="h-5 w-5 text-primary" />}
      />}

      {/* ═══ TODAY'S ROUND / LIVE BANNER ═══ */}
      {tab === "upcoming" && (() => {
        const today = new Date().toISOString().split("T")[0];
        const activeEvents = upcomingEvents.filter(e =>
          e.event_date === today || (e as any).status === "playing" || (e as any).status === "ready"
        );
        if (!activeEvents.length) return null;
        return (
          <div className="mx-4 mb-4 space-y-2">
            {activeEvents.map(e => {
              const isPlaying = (e as any).status === "playing";
              const isReady = (e as any).status === "ready";
              return (
                <div key={e.id} className={`relative overflow-hidden rounded-2xl border p-4 ${
                  isPlaying
                    ? "border-green-500/40 bg-gradient-to-r from-green-500/15 to-green-500/5"
                    : "border-primary/40 bg-gradient-to-r from-primary/20 to-primary/5"
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {isPlaying
                          ? <span className="text-[10px] font-bold uppercase tracking-wider text-green-400 bg-green-400/20 px-2 py-0.5 rounded-full">🟢 Live</span>
                          : isReady
                          ? <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/20 px-2 py-0.5 rounded-full">✓ Ready · Today</span>
                          : <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/20 px-2 py-0.5 rounded-full">🏌️ Today</span>
                        }
                      </div>
                      <p className="text-sm font-bold text-foreground truncate">{e.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {(e.courses as any)?.name ?? ""}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const isPersonal = (e as any).tours?.clubs?.is_personal;
                        if (isPersonal && (e as any).status !== "done") {
                          navigate(`/event/${e.id}/scorecard`);
                        } else {
                          navigate(`/event/${e.id}`);
                        }
                      }}
                      className={`shrink-0 flex items-center gap-1.5 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors ${
                        isPlaying
                          ? "bg-green-500 text-white hover:bg-green-500/90"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                    >
                      ▶ Play
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ═══ SECTION 1: EVENTS ═══ */}
      <div>
        {/* Underline tabs */}
        <div className="flex border-b border-border/50 mx-0">
          {eventTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-0">
          {eventsLoading && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
              <Skeleton className="h-12 w-12 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}

          {!eventsLoading && displayEvents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Calendar className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-semibold">
                {tab === "upcoming" ? "No upcoming events" : "No completed events"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Events will appear after created by organizer</p>
            </div>
          )}

          {displayEvents.filter(event => 
            tab === "done" ? event.status === "done" : (event.status !== "done" && event.status !== "cancelled")
          ).map((event, i) => (
            <button
              key={event.id}
              className="flex w-full items-center gap-3 px-4 py-3 text-left border-b border-border/30 last:border-0 hover:bg-secondary/50 transition-colors animate-fade-in"
              style={{ animationDelay: `${i * 50}ms` }}
              onClick={() => navigate(`/event/${event.id}`)}
            >
              <Avatar className="h-12 w-12 rounded-2xl shrink-0">
                <AvatarImage src={(event.courses as any)?.image_url ?? ""} />
                <AvatarFallback className="rounded-2xl bg-primary/10 text-sm font-bold text-primary">
                  {event.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold truncate">{event.name}</p>
                <p className="text-[13px] text-muted-foreground truncate mt-0.5">
                  {event.event_date} · {(event.courses as any)?.name ?? ""}
                </p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                event.status === "playing" ? "border-green-500/40 text-green-400 bg-green-500/5" :
                event.status === "done" ? "border-primary/40 text-primary bg-primary/5" :
                event.status === "ready" ? "border-accent/40 text-accent bg-accent/5" :
                "border-blue-400/40 text-blue-400 bg-blue-400/5"
              }`}>
                {event.status}
              </span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
  if (embedded) return <>{content}</>;
  return <DesktopLayout>{content}</DesktopLayout>;
};

export default TourList;
