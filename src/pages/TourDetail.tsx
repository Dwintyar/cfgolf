import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Calendar, Users, MapPin, ChevronRight, Settings, UserPlus, Layers, Award, Check, X, Building2, Star, UserMinus, Search, FileText, Loader2, Download } from "lucide-react";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import InviteClubDialog from "@/components/tour/InviteClubDialog";
import RegisterPlayerDialog from "@/components/tour/RegisterPlayerDialog";
import ManageFlightsDialog from "@/components/tour/ManageFlightsDialog";
import ManageCategoriesDialog from "@/components/tour/ManageCategoriesDialog";
import CreateEventDialog from "@/components/tour/CreateEventDialog";
import TourLeaderboard from "@/components/tour/TourLeaderboard";
import TourLeaderboard from "@/components/tour/TourLeaderboard";

const TourDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showInvite, setShowInvite] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showFlights, setShowFlights] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [groupByClub, setGroupByClub] = useState(false);
  const [selectedClubForAdd, setSelectedClubForAdd] = useState<string | null>(null);
  const [showAddPlayerDialog, setShowAddPlayerDialog] = useState(false);
  const [searchAddPlayer, setSearchAddPlayer] = useState("");
  const [showInvitationDialog, setShowInvitationDialog] = useState(false);
  const [selectedEventForInvitation, setSelectedEventForInvitation] = useState<string | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

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
    queryKey: ["tour-players-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tour_players")
        .select(`
          id, player_id, club_id, hcp_at_registration, hcp_tour, status,
          clubs(id, name, logo_url),
          profiles(id, full_name, avatar_url, handicap)
        `)
        .eq("tour_id", id!)
        .order("hcp_at_registration");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: allContestants } = useQuery({
    queryKey: ["tour-all-contestants", id, events?.map(e => e.id)],
    queryFn: async () => {
      const eventIds = events?.map(e => e.id) ?? [];
      if (!eventIds.length) return [];
      const { data } = await supabase
        .from("contestants")
        .select("player_id, hcp, status, event_id, events(id, name, event_date, status)")
        .in("event_id", eventIds);
      return data ?? [];
    },
    enabled: !!id && !!events?.length,
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

  const { data: isOrganizer } = useQuery({
    queryKey: ["tour-organizer-check", id, userId],
    queryFn: async () => {
      if (!userId || !tour?.organizer_club_id) return false;
      const { data } = await supabase
        .from("members")
        .select("role")
        .eq("club_id", tour.organizer_club_id)
        .eq("user_id", userId)
        .in("role", ["owner", "admin"])
        .maybeSingle();
      return !!data;
    },
    enabled: !!userId && !!tour?.organizer_club_id,
  });

  // Check if user is admin of a participant club in this tour
  const { data: myClubInTour } = useQuery({
    queryKey: ["my-club-in-tour", id, userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tour_clubs")
        .select("club_id, ticket_quota, clubs(name)")
        .eq("tour_id", id!);

      const clubIds = (data ?? []).map(tc => tc.club_id);
      if (!clubIds.length) return null;

      const { data: myMembership } = await supabase
        .from("members")
        .select("club_id, role")
        .eq("user_id", userId!)
        .in("club_id", clubIds)
        .in("role", ["owner", "admin"])
        .maybeSingle();

      if (!myMembership) return null;

      const myTourClub = data?.find(tc => tc.club_id === myMembership.club_id);
      return myTourClub ? { ...myTourClub, role: myMembership.role } : null;
    },
    enabled: !!id && !!userId,
  });

  const isClubAdmin = !!myClubInTour;
  const myClubId = myClubInTour?.club_id;
  const myClubQuota = myClubInTour?.ticket_quota ?? 0;
  const myClubName = (myClubInTour?.clubs as any)?.name ?? "";

  // Determine caller's club in this tour
  const { data: callerClubId } = useQuery({
    queryKey: ["tour-caller-club", id, userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data: userMemberships } = await supabase
        .from("members")
        .select("club_id")
        .eq("user_id", userId)
        .in("role", ["owner", "admin"]);
      if (!userMemberships?.length) return null;
      const clubIds = userMemberships.map(m => m.club_id);
      const { data: tourClubMatch } = await supabase
        .from("tour_clubs")
        .select("club_id")
        .eq("tour_id", id!)
        .in("club_id", clubIds)
        .limit(1);
      if (tourClubMatch?.length) return tourClubMatch[0].club_id;
      if (tour?.organizer_club_id && clubIds.includes(tour.organizer_club_id)) {
        return tour.organizer_club_id;
      }
      return null;
    },
    enabled: !!userId && !!id,
  });

  // Group players by club
  const playersByClub = useMemo(() => {
    if (!players) return {};
    return players.reduce((acc: any, p: any) => {
      const clubId = (p.clubs as any)?.id ?? "unknown";
      if (!acc[clubId]) acc[clubId] = { club: p.clubs, players: [] };
      acc[clubId].players.push(p);
      return acc;
    }, {});
  }, [players]);

  // Quota per club
  const clubQuota = useMemo(() => {
    if (!tourClubs) return {};
    return tourClubs.reduce((acc: any, tc: any) => {
      acc[tc.club_id] = tc.ticket_quota ?? 0;
      return acc;
    }, {});
  }, [tourClubs]);

  // Contestants per player
  const contestantMap = useMemo(() => {
    if (!allContestants) return {};
    return allContestants.reduce((acc: any, c: any) => {
      if (!acc[c.player_id]) acc[c.player_id] = [];
      acc[c.player_id].push({
        event_id: c.event_id,
        event_name: (c.events as any)?.name,
        event_date: (c.events as any)?.event_date,
        event_status: (c.events as any)?.status,
        contestant_status: c.status,
        hcp: c.hcp,
      });
      return acc;
    }, {});
  }, [allContestants]);

  // Check if user can manage a specific player (organizer or same club admin)
  const canManagePlayer = (player: any) => {
    if (isOrganizer) return true;
    if (isClubAdmin && !isOrganizer) {
      const playerClubId = player.club_id ?? (player.clubs as any)?.id;
      return playerClubId === myClubId;
    }
    return false;
  };

  const setAsCaptain = async (player: any) => {
    const profile = player.profiles as any;
    const clubId = player.club_id ?? (player.clubs as any)?.id;
    if (!clubId) return;
    await supabase.from("club_staff").upsert({
      club_id: clubId,
      user_id: player.player_id,
      staff_role: "Captain",
      status: "active"
    }, { onConflict: "club_id,user_id" });
    toast.success(`${profile?.full_name} dijadikan Captain`);
    refetchPlayers();
  };

  const removePlayer = async (player: any) => {
    const profile = player.profiles as any;
    const playerName = profile?.full_name ?? "Player";
    const playerClubId = player.club_id ?? (player.clubs as any)?.id;
    const clubName = (player.clubs as any)?.name ?? "Club";

    if (!confirm(`Hapus ${playerName} dari tournament?`)) return;

    await supabase.from("tour_players").delete().eq("id", player.id);
    const eventIds = events?.map((e: any) => e.id) ?? [];
    if (eventIds.length) {
      for (const eventId of eventIds) {
        await supabase.from("contestants")
          .delete()
          .eq("player_id", player.player_id)
          .eq("event_id", eventId);
      }
    }

    // Notify the other party
    if (isOrganizer && playerClubId && playerClubId !== tour?.organizer_club_id) {
      // Organizer removed a participant club's player → notify club admins
      const { data: clubAdmins } = await supabase
        .from("members")
        .select("user_id")
        .eq("club_id", playerClubId)
        .in("role", ["owner", "admin"]);
      for (const admin of clubAdmins ?? []) {
        if (admin.user_id === userId) continue;
        await supabase.from("notifications").insert({
          user_id: admin.user_id,
          type: "tournament_update",
          title: "Player dihapus dari tournament",
          message: `${playerName} telah dihapus dari ${tour?.name} oleh panitia.`,
          metadata: { tour_id: id, club_id: playerClubId },
        });
      }
    } else if (isClubAdmin && !isOrganizer && tour?.organizer_club_id) {
      // Club admin removed own player → notify organizer
      const { data: organizers } = await supabase
        .from("members")
        .select("user_id")
        .eq("club_id", tour.organizer_club_id)
        .in("role", ["owner", "admin"]);
      for (const org of organizers ?? []) {
        if (org.user_id === userId) continue;
        await supabase.from("notifications").insert({
          user_id: org.user_id,
          type: "tournament_update",
          title: "Player dihapus oleh club",
          message: `${playerName} dari ${clubName} telah dihapus dari ${tour?.name}.`,
          metadata: { tour_id: id },
        });
      }
    }

    toast.success(`${playerName} dihapus dari tournament`);
    queryClient.invalidateQueries({ queryKey: ["tour-players-detail", id] });
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

  if (!tour) return (
    <div className="bottom-nav-safe p-4 text-center text-muted-foreground">Tour not found</div>
  );

  // Visible clubs in Group by Club view
  const visibleClubs = isOrganizer
    ? Object.entries(playersByClub)
    : isClubAdmin
      ? Object.entries(playersByClub).filter(([clubId]) => clubId === myClubId)
      : Object.entries(playersByClub);

  return (
    <div className="bottom-nav-safe">
      {/* Header */}
      <div className="p-4">
        <button onClick={() => navigate("/tour")} className="mb-2 text-xs text-muted-foreground hover:text-foreground transition-colors">← All Tours</button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-xl font-bold">{tour.name}</h1>
            <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {(tour.clubs as any)?.name}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {tour.year}</span>
              <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {tourClubs?.filter(tc => tc.status === "accepted").length ?? 0} clubs</span>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-primary/30 text-primary">
            {tour.tournament_type}
          </Badge>
        </div>
        {tour.description && <p className="mt-2 text-xs text-muted-foreground">{tour.description}</p>}
      </div>

      {/* Organizer Actions */}
      {isOrganizer && (
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
          <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1 text-[11px]" onClick={() => setShowInvitationDialog(true)}>
            <FileText className="h-3 w-3" /> Buat Undangan
          </Button>
        </div>
      )}

      {/* Participant Club Admin Actions (non-organizer) */}
      {!isOrganizer && isClubAdmin && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-none">
          <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1 text-[11px]" onClick={() => setShowRegister(true)}>
            <UserPlus className="h-3 w-3" /> Register Player
          </Button>
          <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1 text-[11px]" onClick={() => {
            setSelectedClubForAdd(myClubId ?? null);
            setShowAddPlayerDialog(true);
          }}>
            <UserPlus className="h-3 w-3" /> Daftarkan Player
          </Button>
        </div>
      )}

      {/* Regular user Actions (non-organizer, non-club-admin) */}
      {!isOrganizer && !isClubAdmin && userId && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-none">
          <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1 text-[11px]" onClick={() => setShowRegister(true)}>
            <UserPlus className="h-3 w-3" /> Register Player
          </Button>
        </div>
      )}

      <Tabs defaultValue="events" className="px-4">
        <TabsList className="w-full flex-wrap h-auto gap-0.5 p-1">
          <TabsTrigger value="events" className="flex-1 text-xs">Events</TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex-1 text-xs">Leaderboard</TabsTrigger>
          <TabsTrigger value="players" className="flex-1 text-xs">Players</TabsTrigger>
          <TabsTrigger value="clubs" className="flex-1 text-xs">Clubs</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-3 pt-2">
          {events?.length === 0 && (
            <div className="golf-card p-6 text-center text-sm text-muted-foreground">No events scheduled</div>
          )}
          {events?.map((event, i) => {
            const eventStatusLabel = event.status === "completed" ? "Completed" : event.status === "playing" || event.status === "checkin" ? "Upcoming" : "Scheduled";
            const eventStatusClass = event.status === "completed" ? "border-primary/40 text-primary bg-primary/5" : event.status === "playing" || event.status === "checkin" ? "border-accent/40 text-accent bg-accent/5" : "border-muted-foreground/30 text-muted-foreground";
            const formattedDate = new Date(event.event_date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
            return (
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
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formattedDate}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {(event.courses as any)?.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${eventStatusClass}`}>
                      {eventStatusLabel}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </button>
            );
          })}
        </TabsContent>

        <TabsContent value="players" className="space-y-3 pt-2">
          <p className="text-[10px] text-muted-foreground italic">
            Tournament HCP berkembang setiap event. Personal HCP tidak terpengaruh.
          </p>

          {/* Club Admin Info Banner */}
          {isClubAdmin && !isOrganizer && myClubId && (
            <div className="golf-card p-3 border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{myClubName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Quota: {playersByClub[myClubId]?.players?.filter((p: any) => p.status !== "pending").length ?? 0}/{myClubQuota} slot terpakai
                  </p>
                </div>
                {(playersByClub[myClubId]?.players?.filter((p: any) => p.status !== "pending").length ?? 0) < myClubQuota && (
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                    {myClubQuota - (playersByClub[myClubId]?.players?.filter((p: any) => p.status !== "pending").length ?? 0)} slot kosong
                  </Badge>
                )}
              </div>
              <Button
                size="sm"
                className="w-full mt-2 h-8 gap-1 text-[11px]"
                onClick={() => {
                  setSelectedClubForAdd(myClubId);
                  setShowAddPlayerDialog(true);
                }}
              >
                <UserPlus className="h-3 w-3" /> Daftarkan Player dari Club Saya
              </Button>
            </div>
          )}

          {/* SECTION: Pending Approval */}
          {(() => {
            const pendingPlayers = players?.filter(p => {
              if (p.status !== "pending") return false;
              // Club admin only sees their own club's pending
              if (isClubAdmin && !isOrganizer) {
                return p.club_id === myClubId || (p.clubs as any)?.id === myClubId;
              }
              return true;
            }) ?? [];

            if (pendingPlayers.length === 0) return null;

            return (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  ⏳ Pending Approval ({pendingPlayers.length})
                </p>
                {pendingPlayers.map(p => {
                  const personalHcp = (p.profiles as any)?.handicap;
                  const tourHcp = p.hcp_tour ?? p.hcp_at_registration;
                  return (
                    <div key={p.id} className="golf-card flex items-center gap-3 p-3 mb-2 border-accent/30">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                        {(p.profiles as any)?.full_name?.charAt(0) ?? "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{(p.profiles as any)?.full_name ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{(p.clubs as any)?.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Personal: {personalHcp ?? "—"} · Tournament: <span className="font-semibold text-foreground">{tourHcp ?? "—"}</span>
                        </p>
                      </div>
                      {isOrganizer ? (
                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="sm"
                            className="h-7 px-2 text-[10px] gap-1"
                            onClick={async () => {
                              const { error } = await supabase.from("tour_players").update({ status: "registered" }).eq("id", p.id);
                              if (error) {
                                toast.error("Gagal: " + error.message);
                                return;
                              }
                              toast.success(`${(p.profiles as any)?.full_name} registered!`);
                              refetchPlayers();
                            }}
                          >
                            <Check className="h-3 w-3" /> Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[10px] gap-1 text-destructive border-destructive/30"
                            onClick={async () => {
                              const { error } = await supabase.from("tour_players").delete().eq("id", p.id);
                              if (error) {
                                toast.error("Gagal: " + error.message);
                                return;
                              }
                              toast.success("Player removed");
                              refetchPlayers();
                            }}
                          >
                            <X className="h-3 w-3" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-accent border-accent/30">pending</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* SECTION: Registered Players */}
          {(() => {
            const registered = players?.filter(p => p.status !== "pending") ?? [];
            if (registered.length === 0) return null;

            const renderPlayerRow = (player: any) => {
              const profile = player.profiles as any;
              const myEvents = contestantMap[player.player_id] ?? [];
              const tourHcp = player.hcp_tour ?? player.hcp_at_registration;
              const showActions = canManagePlayer(player);

              return (
                <div key={player.id} className="p-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url ?? ""} />
                      <AvatarFallback className="bg-secondary text-xs font-bold">
                        {(profile?.full_name ?? "?").charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{profile?.full_name ?? "Unknown"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        HCP {player.hcp_at_registration ?? "N/A"}
                        {tourHcp !== player.hcp_at_registration && tourHcp != null && (
                          <span className="text-primary ml-1">→ {tourHcp}</span>
                        )}
                        {!groupByClub && (
                          <span className="ml-1.5">· {(player.clubs as any)?.name}</span>
                        )}
                      </p>
                    </div>
                    {(() => {
                      const hcp = player.hcp_at_registration ?? (profile?.handicap ?? null);
                      if (hcp == null) return null;
                      const level = hcp <= 16 ? "A" : hcp <= 22 ? "B" : "C";
                      const cls = level === "A" ? "bg-blue-500/10 text-blue-600 border-blue-500/30" : level === "B" ? "bg-amber-500/10 text-amber-600 border-amber-500/30" : "bg-muted text-muted-foreground border-border";
                      return <Badge variant="outline" className={`text-[9px] shrink-0 ${cls}`}>Level {level}</Badge>;
                    })()}
                    <Badge variant="outline" className="text-[9px] shrink-0">{player.status}</Badge>
                    {showActions && (
                      <div className="flex gap-0.5 shrink-0">
                        <button
                          onClick={() => setAsCaptain(player)}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                          title="Set as Captain"
                        >
                          <Star className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => removePlayer(player)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Remove player"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {myEvents.length > 0 && (
                    <div className="mt-2 ml-10 flex flex-wrap gap-1">
                      {myEvents.map((ev: any) => (
                        <span key={ev.event_id}
                          className={`text-[9px] px-2 py-0.5 rounded-full ${
                            ev.event_status === "completed"
                              ? "bg-primary/10 text-primary"
                              : "bg-secondary text-muted-foreground"
                          }`}>
                          {ev.event_name}
                          {ev.hcp != null && ` (HCP ${ev.hcp})`}
                        </span>
                      ))}
                    </div>
                  )}
                  {myEvents.length === 0 && (
                    <p className="mt-1 ml-10 text-[9px] text-muted-foreground/50 italic">
                      Belum ikut event
                    </p>
                  )}
                </div>
              );
            };

            return (
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <p className="text-sm font-semibold text-muted-foreground">
                    {registered.length} players · {Object.keys(playersByClub).length} clubs
                  </p>
                  <button
                    onClick={() => setGroupByClub(!groupByClub)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors font-medium ${
                      groupByClub
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary"
                    }`}
                  >
                    <Building2 className="h-3 w-3 inline mr-1" />
                    {groupByClub ? "By Club ✓" : "By Club"}
                  </button>
                </div>

                {groupByClub ? (
                  <div className="space-y-4">
                    {visibleClubs
                      .sort(([, a]: any, [, b]: any) =>
                        (a.club?.name ?? "").localeCompare(b.club?.name ?? ""))
                      .map(([clubId, clubData]: [string, any]) => {
                        const quota = clubQuota[clubId] ?? 0;
                        const registeredInClub = clubData.players.filter((p: any) => p.status !== "pending");
                        const playerCount = registeredInClub.length;
                        const canAddToClub = isOrganizer || (isClubAdmin && clubId === myClubId);

                        return (
                          <div key={clubId} className="golf-card overflow-hidden">
                            {/* Club header */}
                            <div className="flex items-center gap-3 p-3 bg-secondary/50 border-b border-border/50">
                              <Avatar className="h-8 w-8 rounded-lg">
                                <AvatarImage src={clubData.club?.logo_url ?? ""} />
                                <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-bold text-primary">
                                  {(clubData.club?.name ?? "?").charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">
                                  {clubData.club?.name ?? "Unknown Club"}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {playerCount} player terdaftar
                                  {quota > 0 && (
                                    <span className={`ml-1.5 font-medium ${
                                      playerCount > quota ? "text-destructive" : "text-primary"
                                    }`}>
                                      · Quota: {playerCount}/{quota} tiket
                                    </span>
                                  )}
                                </p>
                              </div>
                              {quota > 0 && (
                                <div className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                                  playerCount >= quota
                                    ? "bg-primary/10 text-primary"
                                    : "bg-accent/10 text-accent"
                                }`}>
                                  {playerCount}/{quota}
                                </div>
                              )}
                              {canAddToClub && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 shrink-0 gap-1 text-[10px]"
                                  onClick={() => {
                                    setSelectedClubForAdd(clubId);
                                    setShowAddPlayerDialog(true);
                                  }}
                                >
                                  <UserPlus className="h-3 w-3" /> Tambah
                                </Button>
                              )}
                            </div>
                            {/* Players */}
                            <div className="divide-y divide-border/30">
                              {registeredInClub
                                .sort((a: any, b: any) =>
                                  ((a.profiles as any)?.full_name ?? "").localeCompare((b.profiles as any)?.full_name ?? ""))
                                .map(renderPlayerRow)}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="space-y-0 golf-card overflow-hidden divide-y divide-border/30">
                    {registered
                      .sort((a: any, b: any) =>
                        ((a.profiles as any)?.full_name ?? "").localeCompare((b.profiles as any)?.full_name ?? ""))
                      .map(renderPlayerRow)}
                  </div>
                )}
              </div>
            );
          })()}

          {(!players || players.length === 0) && (
            <div className="golf-card p-6 text-center text-sm text-muted-foreground">No players registered yet</div>
          )}
        </TabsContent>

        <TabsContent value="clubs" className="space-y-2 pt-2">
          {tourClubs?.length === 0 && (
            <div className="golf-card p-6 text-center text-sm text-muted-foreground">No clubs invited</div>
          )}
          {tourClubs
            ?.filter(tc => tc.status === "accepted")
            .sort((a, b) => ((a.clubs as any)?.name ?? "").localeCompare((b.clubs as any)?.name ?? ""))
            .map((tc) => {
              const clubPlayerCount = playersByClub[tc.club_id]?.players?.filter((p: any) => p.status !== "pending").length ?? 0;
              return (
                <div key={tc.id} className="golf-card flex items-center gap-3 p-3">
                  <Avatar className="h-9 w-9 rounded-lg">
                    <AvatarImage src={(tc.clubs as any)?.logo_url ?? ""} />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {((tc.clubs as any)?.name ?? "?").charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{(tc.clubs as any)?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Quota: {tc.ticket_quota} · Players: {clubPlayerCount}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${tc.status === "accepted" ? "text-primary border-primary/30" : "text-accent border-accent/30"}`}>
                    {tc.status}
                  </Badge>
                </div>
              );
            })}
        </TabsContent>

        <TabsContent value="leaderboard">
          <TourLeaderboard tourId={id!} tourName={tour.name} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {tour.tournament_type === "interclub" && (
        <InviteClubDialog tourId={tour.id} open={showInvite} onOpenChange={setShowInvite} onDone={() => { setShowInvite(false); refetchClubs(); }} />
      )}
      <RegisterPlayerDialog tourId={tour.id} tourType={tour.tournament_type!} organizerClubId={tour.organizer_club_id} callerClubId={callerClubId ?? undefined} open={showRegister} onOpenChange={setShowRegister} onDone={() => { setShowRegister(false); refetchPlayers(); }} />
      <ManageFlightsDialog tourId={tour.id} open={showFlights} onOpenChange={setShowFlights} />
      <ManageCategoriesDialog tourId={tour.id} open={showCategories} onOpenChange={setShowCategories} />
      <CreateEventDialog tourId={tour.id} open={showCreateEvent} onOpenChange={setShowCreateEvent} onDone={() => { setShowCreateEvent(false); refetchEvents(); }} />

      {/* Add Player from Club Dialog */}
      <Dialog open={showAddPlayerDialog} onOpenChange={(open) => { setShowAddPlayerDialog(open); if (!open) setSearchAddPlayer(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Player</DialogTitle>
          </DialogHeader>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama..."
              value={searchAddPlayer}
              onChange={(e) => setSearchAddPlayer(e.target.value)}
              className="pl-10"
            />
          </div>
          {selectedClubForAdd && (
            <AddPlayerFromClubList
              clubId={selectedClubForAdd}
              tourId={id!}
              organizerClubId={tour.organizer_club_id}
              tourName={tour.name}
              callerClubName={isClubAdmin && !isOrganizer ? myClubName : undefined}
              isClubAdminAdding={isClubAdmin && !isOrganizer}
              eventIds={events?.map((e: any) => e.id) ?? []}
              search={searchAddPlayer}
              existingPlayerIds={players?.map(p => p.player_id) ?? []}
              onAdded={() => {
                setShowAddPlayerDialog(false);
                setSearchAddPlayer("");
                queryClient.invalidateQueries({ queryKey: ["tour-players-detail", id] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Generate Invitation Letter Dialog */}
      <Dialog open={showInvitationDialog} onOpenChange={(open) => { setShowInvitationDialog(open); if (!open) setSelectedEventForInvitation(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Generate Surat Undangan
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Pilih Event</p>
              <select
                className="w-full rounded-lg bg-secondary text-sm p-2.5 border-none outline-none"
                value={selectedEventForInvitation ?? ""}
                onChange={(e) => setSelectedEventForInvitation(e.target.value || null)}
              >
                <option value="">-- Pilih event --</option>
                {events?.map((ev: any) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} · {new Date(ev.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </option>
                ))}
              </select>
            </div>

            {selectedEventForInvitation && (() => {
              const ev = events?.find((e: any) => e.id === selectedEventForInvitation);
              if (!ev) return null;
              return (
                <div className="golf-card p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Event</span>
                    <span className="font-medium">{ev.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tanggal</span>
                    <span className="font-medium">
                      {new Date(ev.event_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Venue</span>
                    <span className="font-medium">{(ev.courses as any)?.name ?? '-'}</span>
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowInvitationDialog(false)}>
                Batal
              </Button>
              <Button
                size="sm"
                disabled={!selectedEventForInvitation || generatingPDF}
                onClick={() => generateInvitationPDF(selectedEventForInvitation!)}
              >
                {generatingPDF ? (
                  <><Loader2 className="h-3 w-3 animate-spin" /> Generating...</>
                ) : (
                  <><Download className="h-3 w-3" /> Download PNG</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  async function generateInvitationPDF(eventId: string) {
    setGeneratingPDF(true);
    try {
      const ev = events?.find((e: any) => e.id === eventId);
      if (!ev) return;

      const { data: staffData } = await supabase
        .from("club_staff")
        .select("staff_role, profiles(full_name)")
        .eq("club_id", tour!.organizer_club_id)
        .eq("status", "active")
        .order("staff_role");

      const staff: Record<string, string[]> = {};
      (staffData ?? []).forEach((s: any) => {
        const role = s.staff_role;
        const name = (s.profiles as any)?.full_name ?? "";
        if (!staff[role]) staff[role] = [];
        staff[role].push(name);
      });

      const { data: clubQuotas } = await supabase
        .from("tour_clubs")
        .select("ticket_quota, clubs(name)")
        .eq("tour_id", tour!.id)
        .eq("status", "accepted")
        .order("ticket_quota", { ascending: false });

      const quota6 = (clubQuotas ?? []).filter(c => (c.ticket_quota ?? 0) >= 6).map(c => ((c.clubs as any)?.name ?? "").replace(" Golf Club", ""));
      const quota4 = (clubQuotas ?? []).filter(c => c.ticket_quota === 4).map(c => ((c.clubs as any)?.name ?? "").replace(" Golf Club", ""));

      const eventDate = new Date(ev.event_date);
      const dateStr = eventDate.toLocaleDateString("id-ID", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });

      const organizerName = (tour?.clubs as any)?.name ?? "The Explorationists Golf Club";

      const el = document.createElement("div");
      el.style.cssText = "width:794px;padding:56px 60px;background:white;color:#1a1a1a;font-family:'Times New Roman',serif;position:fixed;top:-9999px;left:-9999px;";

      el.innerHTML = `
        <div style="display:flex;gap:28px;">
          <div style="width:220px;border-right:1px solid #ccc;padding-right:20px;font-size:11px;line-height:1.7;">
            <div style="text-align:center;margin-bottom:20px;">
              <h1 style="font-size:16px;font-weight:bold;letter-spacing:1.5px;margin:0;line-height:1.3;">The Explorationists<br/>Golf Club</h1>
            </div>
            <div style="width:100%;height:1px;background:#999;margin:12px 0;"></div>
            ${staff['Chairman']?.length ? `<p style="font-weight:bold;margin:0 0 2px;">Chairman</p>${staff['Chairman'].map(n => `<p style="margin:0;">${n}</p>`).join('')}<br/>` : ''}
            ${staff['Co-Chairman']?.length ? `<p style="font-weight:bold;margin:0 0 2px;">Co-Chairman</p>${staff['Co-Chairman'].map(n => `<p style="margin:0;">${n}</p>`).join('')}<br/>` : ''}
            ${staff['Tournament Chairman']?.length ? `<p style="font-weight:bold;margin:0 0 2px;">Tournament Committee</p><p style="margin:0;">Chairman:</p>${staff['Tournament Chairman'].map((n, i) => `<p style="margin:0;">${i + 1}. ${n}</p>`).join('')}<br/>` : ''}
            ${staff['Captain']?.length ? `<p style="margin:0;">Captain:</p>${staff['Captain'].map((n, i) => `<p style="margin:0;">${i + 1}. ${n}</p>`).join('')}<br/>` : ''}
            ${staff['Handicap Committee']?.length ? `<p style="margin:0;">Handicap Committee:</p>${staff['Handicap Committee'].map((n, i) => `<p style="margin:0;">${i + 1}. ${n}</p>`).join('')}<br/>` : ''}
            ${staff['Committee Member']?.length ? `<p style="margin:0;">Committee Members:</p>${staff['Committee Member'].map((n, i) => `<p style="margin:0;">${i + 1}. ${n}</p>`).join('')}<br/>` : ''}
            <div style="margin-top:16px;padding:10px;background:#f5f5f5;border-radius:6px;">
              <p style="font-weight:bold;margin:0 0 4px;font-size:12px;">QUOTA</p>
              <p style="margin:0;font-size:10px;color:#666;">for member in competition</p>
              ${quota6.length ? `<p style="margin:8px 0 2px;font-weight:bold;">→ 6 members:</p><p style="margin:0;color:#444;">${quota6.join(', ')}</p>` : ''}
              ${quota4.length ? `<p style="margin:8px 0 2px;font-weight:bold;">→ 4 members:</p><p style="margin:0;color:#444;">${quota4.join(', ')}</p>` : ''}
              <p style="margin:8px 0 2px;font-weight:bold;">→ 2 members only:</p>
              <p style="margin:0;color:#444;">other companies</p>
            </div>
          </div>
          <div style="flex:1;font-size:13px;line-height:1.8;">
            <h2 style="font-size:18px;font-weight:bold;text-align:center;margin:0 0 20px;letter-spacing:1px;">GOLF TOURNAMENT — ${(ev.name ?? "").toUpperCase()}</h2>
            <p>Dear Explorationist Golfers,</p>
            <p style="text-align:justify;">You are cordially invited to participate in the <strong>Explorationists Golf Tournament</strong> which will be held on:</p>
            <table style="margin:16px 0;font-size:13px;">
              <tr><td style="font-weight:bold;padding-right:16px;">Date</td><td>: ${dateStr}</td></tr>
              <tr><td style="font-weight:bold;padding-right:16px;">Venue</td><td>: ${(ev.courses as any)?.name ?? "-"}</td></tr>
              <tr><td style="font-weight:bold;padding-right:16px;">Tee Off</td><td>: 07:00 AM (Shotgun Start)</td></tr>
            </table>
            <p style="text-align:justify;">The Committee will appreciate your early confirmation of participation. Please register your team players according to your company's allocated quota.</p>
            <p style="text-align:justify;">Please note that absence without prior notice will be monitored and may affect registration eligibility for subsequent tournaments.</p>
            <p>We look forward to seeing you on the course!</p>
            <div style="margin-top:40px;text-align:center;">
              <p style="margin:0;">The Committee,</p>
              <div style="height:24px;"></div>
              <p style="margin:0 0 4px;font-weight:bold;">${(staff['Tournament Chairman'] ?? ['Committee']).join(' / ')}</p>
              <p style="margin:0;font-size:11px;color:#666;">Tournament Chairman</p>
            </div>
          </div>
        </div>
        <div style="text-align:center;margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:10px;color:#999;">
          Generated by CFGolf Platform · ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      `;

      document.body.appendChild(el);
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
      document.body.removeChild(el);

      const link = document.createElement("a");
      link.download = `Undangan-${(ev.name ?? "EGT").replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast.success("Surat undangan berhasil di-download!");
      setShowInvitationDialog(false);
      setSelectedEventForInvitation(null);
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal generate: " + err.message);
    }
    setGeneratingPDF(false);
  }
};

const AddPlayerFromClubList = ({
  clubId, tourId, organizerClubId, tourName, callerClubName, isClubAdminAdding,
  eventIds, search, existingPlayerIds, onAdded
}: {
  clubId: string; tourId: string; organizerClubId: string; tourName: string;
  callerClubName?: string; isClubAdminAdding?: boolean;
  eventIds: string[]; search: string; existingPlayerIds: string[]; onAdded: () => void;
}) => {
  const { data: clubMembers } = useQuery({
    queryKey: ["club-members-add", clubId, existingPlayerIds],
    queryFn: async () => {
      const { data } = await supabase
        .from("members")
        .select("user_id, profiles(id, full_name, avatar_url, handicap)")
        .eq("club_id", clubId);
      return (data ?? [])
        .filter(m => !existingPlayerIds.includes(m.user_id))
        .sort((a: any, b: any) =>
          ((a.profiles as any)?.full_name ?? "").localeCompare((b.profiles as any)?.full_name ?? ""));
    },
    enabled: !!clubId,
  });

  const filtered = clubMembers?.filter((m: any) =>
    !search || (m.profiles as any)?.full_name?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const addPlayer = async (m: any) => {
    const profile = m.profiles as any;
    const hcp = profile?.handicap ?? 20;
    const playerName = profile?.full_name ?? "Player";

    await supabase.from("tour_players").insert({
      tour_id: tourId,
      player_id: m.user_id,
      club_id: clubId,
      hcp_at_registration: hcp,
      hcp_tour: hcp,
      status: "active",
    });

    for (const eventId of eventIds) {
      await supabase.from("contestants").upsert({
        event_id: eventId,
        player_id: m.user_id,
        hcp: hcp,
        status: "competitor",
      }, { onConflict: "event_id,player_id" });
    }

    // Notify organizer when club admin adds a player
    if (isClubAdminAdding && organizerClubId) {
      const { data: organizers } = await supabase
        .from("members")
        .select("user_id")
        .eq("club_id", organizerClubId)
        .in("role", ["owner", "admin"]);

      const { data: { user } } = await supabase.auth.getUser();

      for (const org of organizers ?? []) {
        if (org.user_id === user?.id) continue;
        await supabase.from("notifications").insert({
          user_id: org.user_id,
          type: "tournament_update",
          title: "Player baru didaftarkan",
          message: `${playerName} dari ${callerClubName ?? "club peserta"} telah didaftarkan ke ${tourName}.`,
          metadata: { tour_id: tourId },
        });
      }
    }

    toast.success(`${playerName} ditambahkan!`);
    onAdded();
  };

  return (
    <div className="max-h-64 overflow-y-auto space-y-1">
      {filtered.length === 0 && (
        <p className="text-center text-xs text-muted-foreground py-4">
          {clubMembers?.length === 0 ? "Semua member sudah terdaftar" : "Tidak ditemukan"}
        </p>
      )}
      {filtered.map((m: any) => {
        const profile = m.profiles as any;
        return (
          <div key={m.user_id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-secondary/50">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-secondary text-xs font-bold">
                {(profile?.full_name ?? "?").charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name}</p>
              <p className="text-[10px] text-muted-foreground">HCP {profile?.handicap ?? "N/A"}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] shrink-0"
              onClick={() => addPlayer(m)}
            >
              + Tambah
            </Button>
          </div>
        );
      })}
    </div>
  );
};

export default TourDetail;
