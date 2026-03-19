import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Calendar, Users, MapPin, ChevronRight, Settings, UserPlus, Layers, Award, Check, X, Building2, Star, UserMinus, Search } from "lucide-react";
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

  // Determine caller's club in this tour
  const { data: callerClubId } = useQuery({
    queryKey: ["tour-caller-club", id, userId],
    queryFn: async () => {
      if (!userId) return null;
      // Find which club(s) in this tour the user belongs to
      const { data: userMemberships } = await supabase
        .from("members")
        .select("club_id")
        .eq("user_id", userId)
        .in("role", ["owner", "admin"]);
      if (!userMemberships?.length) return null;
      const clubIds = userMemberships.map(m => m.club_id);
      // Check which of those clubs participate in this tour
      const { data: tourClubMatch } = await supabase
        .from("tour_clubs")
        .select("club_id")
        .eq("tour_id", id!)
        .in("club_id", clubIds)
        .limit(1);
      if (tourClubMatch?.length) return tourClubMatch[0].club_id;
      // Fallback: check if user is organizer club member
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
        </div>
      )}

      {/* Participant Actions (non-organizer) */}
      {!isOrganizer && userId && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-none">
          <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1 text-[11px]" onClick={() => setShowRegister(true)}>
            <UserPlus className="h-3 w-3" /> Register Player
          </Button>
        </div>
      )}

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

        <TabsContent value="players" className="space-y-3 pt-2">
          <p className="text-[10px] text-muted-foreground italic">
            Tournament HCP berkembang setiap event. Personal HCP tidak terpengaruh.
          </p>

          {/* SECTION: Pending Approval */}
          {(players?.filter(p => p.status === "pending").length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                ⏳ Pending Approval ({players?.filter(p => p.status === "pending").length})
              </p>
              {players?.filter(p => p.status === "pending").map(p => {
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
                              console.error("Accept error:", error);
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
                              console.error("Reject error:", error);
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
          )}

          {/* SECTION: Registered Players */}
          {(() => {
            const registered = players?.filter(p => p.status !== "pending") ?? [];
            if (registered.length === 0) return null;

            const renderPlayerRow = (player: any) => {
              const profile = player.profiles as any;
              const myEvents = contestantMap[player.player_id] ?? [];
              const tourHcp = player.hcp_tour ?? player.hcp_at_registration;

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
                    <Badge variant="outline" className="text-[9px] shrink-0">{player.status}</Badge>
                    {isOrganizer && (
                      <div className="flex gap-0.5 shrink-0">
                        <button
                          onClick={async () => {
                            const clubId = player.club_id ?? (player.clubs as any)?.id;
                            if (!clubId) return;
                            await supabase.from("club_staff")
                              .upsert({
                                club_id: clubId,
                                user_id: player.player_id,
                                staff_role: "Captain",
                                status: "active"
                              }, { onConflict: "club_id,user_id" });
                            toast.success(`${profile?.full_name} dijadikan Captain`);
                            refetchPlayers();
                          }}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                          title="Set as Captain"
                        >
                          <Star className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Hapus ${profile?.full_name} dari tournament?`)) return;
                            await supabase.from("tour_players").delete().eq("id", player.id);
                            const eventIds = events?.map((e: any) => e.id) ?? [];
                            if (eventIds.length) {
                              await supabase.from("contestants")
                                .delete()
                                .eq("player_id", player.player_id)
                                .in("event_id", eventIds);
                            }
                            toast.success("Player dihapus dari tournament");
                            queryClient.invalidateQueries({ queryKey: ["tour-players-detail", id] });
                          }}
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
                    {Object.entries(playersByClub)
                      .sort(([, a]: any, [, b]: any) =>
                        (a.club?.name ?? "").localeCompare(b.club?.name ?? ""))
                      .map(([clubId, clubData]: [string, any]) => {
                        const quota = clubQuota[clubId] ?? 0;
                        const playerCount = clubData.players.filter((p: any) => p.status !== "pending").length;

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
                            </div>
                            {/* Organizer: add player button */}
                            {isOrganizer && (
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
                            {clubData.players
                              .filter((p: any) => p.status !== "pending")
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
      <RegisterPlayerDialog tourId={tour.id} tourType={tour.tournament_type!} organizerClubId={tour.organizer_club_id} callerClubId={callerClubId ?? undefined} open={showRegister} onOpenChange={setShowRegister} onDone={() => { setShowRegister(false); refetchPlayers(); }} />
      <ManageFlightsDialog tourId={tour.id} open={showFlights} onOpenChange={setShowFlights} />
      <ManageCategoriesDialog tourId={tour.id} open={showCategories} onOpenChange={setShowCategories} />
      <CreateEventDialog tourId={tour.id} open={showCreateEvent} onOpenChange={setShowCreateEvent} onDone={() => { setShowCreateEvent(false); refetchEvents(); }} />
    </div>
  );
};

export default TourDetail;
