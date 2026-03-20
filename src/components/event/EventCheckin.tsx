import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, Search, UserPlus, Check, Undo2 } from "lucide-react";
import { toast } from "sonner";

interface EventCheckinProps {
  eventId: string;
  isAdmin: boolean;
  userId: string | null;
  event: any;
}

const EventCheckin = ({ eventId, isAdmin, userId, event }: EventCheckinProps) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [walkinSearch, setWalkinSearch] = useState("");
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [subTab, setSubTab] = useState("players");

  // Contestants
  const { data: contestants } = useQuery({
    queryKey: ["checkin-contestants", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contestants")
        .select("*, profiles:player_id(full_name, avatar_url, handicap), tournament_flights(flight_name)")
        .eq("event_id", eventId);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Checkins
  const { data: checkins } = useQuery({
    queryKey: ["checkin-data", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_checkins")
        .select("*")
        .eq("event_id", eventId);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Tickets
  const { data: tickets } = useQuery({
    queryKey: ["checkin-tickets", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("ticket_number, assigned_player_id")
        .eq("event_id", eventId);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Walkin search profiles
  const { data: walkinProfiles } = useQuery({
    queryKey: ["walkin-search", walkinSearch],
    queryFn: async () => {
      if (walkinSearch.length < 2) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, handicap")
        .ilike("full_name", `%${walkinSearch}%`)
        .limit(20);
      return data ?? [];
    },
    enabled: walkinSearch.length >= 2,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`checkin-rt-${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_checkins", filter: `event_id=eq.${eventId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["checkin-data", eventId] });
          queryClient.invalidateQueries({ queryKey: ["event-checkins", eventId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId, queryClient]);

  // Derived data
  const checkinMap = useMemo(() => {
    const map = new Map<string, any>();
    checkins?.forEach(ci => map.set(ci.contestant_id, ci));
    return map;
  }, [checkins]);

  const ticketMap = useMemo(() => {
    const map = new Map<string, number>();
    tickets?.forEach(t => { if (t.assigned_player_id) map.set(t.assigned_player_id, t.ticket_number); });
    return map;
  }, [tickets]);

  const registeredCount = contestants?.length ?? 0;
  const checkedInCount = checkins?.length ?? 0;
  const notYetCount = registeredCount - checkedInCount;
  const progressPct = registeredCount > 0 ? (checkedInCount / registeredCount) * 100 : 0;

  const contestantPlayerIds = useMemo(() => new Set(contestants?.map(c => c.player_id) ?? []), [contestants]);

  const filteredWalkins = useMemo(() => {
    if (!walkinProfiles) return [];
    return walkinProfiles.filter(p => !contestantPlayerIds.has(p.id));
  }, [walkinProfiles, contestantPlayerIds]);

  const sortedContestants = useMemo(() => {
    if (!contestants) return [];
    let list = [...contestants].sort((a, b) =>
      ((a.profiles as any)?.full_name ?? "").localeCompare((b.profiles as any)?.full_name ?? "", "id")
    );
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => ((c.profiles as any)?.full_name ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [contestants, search]);

  // Handlers
  const handleCheckin = async (contestantId: string) => {
    setProcessingIds(prev => new Set(prev).add(contestantId));
    try {
      const nextBagDrop = (checkins?.length ?? 0) + 1;
      const { error } = await supabase.from("event_checkins").insert({
        event_id: eventId,
        contestant_id: contestantId,
        bag_drop_number: nextBagDrop,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["checkin-data", eventId] });
      toast.success("Checked in!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessingIds(prev => { const n = new Set(prev); n.delete(contestantId); return n; });
    }
  };

  const handleUndo = async (contestantId: string) => {
    setProcessingIds(prev => new Set(prev).add(contestantId));
    try {
      const { error } = await supabase
        .from("event_checkins")
        .delete()
        .eq("event_id", eventId)
        .eq("contestant_id", contestantId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["checkin-data", eventId] });
      toast.success("Check-in undone");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessingIds(prev => { const n = new Set(prev); n.delete(contestantId); return n; });
    }
  };

  const handleWalkin = async (profileId: string, profileName: string) => {
    setProcessingIds(prev => new Set(prev).add(profileId));
    try {
      // Insert contestant
      const { data: newContestant, error: cErr } = await supabase
        .from("contestants")
        .insert({ event_id: eventId, player_id: profileId, status: "walk_in" })
        .select("id")
        .single();
      if (cErr) throw cErr;
      // Check them in immediately
      const { error: ciErr } = await supabase.from("event_checkins").insert({
        event_id: eventId,
        contestant_id: newContestant.id,
        bag_drop_number: (checkins?.length ?? 0) + 1,
      });
      if (ciErr) throw ciErr;
      queryClient.invalidateQueries({ queryKey: ["checkin-contestants", eventId] });
      queryClient.invalidateQueries({ queryKey: ["checkin-data", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-contestants", eventId] });
      toast.success(`${profileName} added as walk-in & checked in`);
      setWalkinSearch("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessingIds(prev => { const n = new Set(prev); n.delete(profileId); return n; });
    }
  };

  // ========== PLAYER VIEW ==========
  if (!isAdmin) {
    const myContestant = contestants?.find(c => c.player_id === userId);
    const myCheckin = myContestant ? checkinMap.get(myContestant.id) : null;
    const myTicket = userId ? ticketMap.get(userId) : null;

    return (
      <div className="space-y-4 pt-2">
        <div className="golf-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold">Your Check-in Status</h3>
          </div>
          {myContestant ? (
            <>
              <p className="text-xs text-muted-foreground">
                Registered for <span className="font-medium text-foreground">{event?.name}</span> · {event?.event_date} · {(event?.courses as any)?.name}
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                {myTicket && <Badge variant="outline">Ticket #{myTicket}</Badge>}
                {(myContestant.tournament_flights as any)?.flight_name && (
                  <Badge variant="outline">{(myContestant.tournament_flights as any).flight_name}</Badge>
                )}
                <Badge variant="outline">HCP {myContestant.hcp ?? "—"}</Badge>
              </div>
              {myCheckin ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    Checked In at {new Date(myCheckin.checked_in_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Not checked in yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Please check in at the registration desk</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">You are not registered for this event.</p>
          )}
        </div>
      </div>
    );
  }

  // ========== ADMIN VIEW ==========
  return (
    <div className="space-y-4 pt-2">
      {/* SECTION 1 — Summary bar */}
      <div className="golf-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" /> Check-in
          </h3>
          <span className="text-xs text-muted-foreground">{checkedInCount} / {registeredCount}</span>
        </div>
        <Progress value={progressPct} className="h-2" />
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-muted p-2">
            <p className="text-lg font-bold text-foreground">{registeredCount}</p>
            <p className="text-[10px] text-muted-foreground">Registered</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-2">
            <p className="text-lg font-bold text-primary">{checkedInCount}</p>
            <p className="text-[10px] text-muted-foreground">Checked In</p>
          </div>
          <div className="rounded-lg bg-muted p-2">
            <p className="text-lg font-bold text-foreground">{notYetCount}</p>
            <p className="text-[10px] text-muted-foreground">Not Yet</p>
          </div>
        </div>
      </div>

      {/* Sub-tabs: Players / Walk-ins */}
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="w-full">
          <TabsTrigger value="players" className="flex-1 text-xs gap-1">
            <ClipboardCheck className="h-3 w-3" /> Players
          </TabsTrigger>
          <TabsTrigger value="walkins" className="flex-1 text-xs gap-1">
            <UserPlus className="h-3 w-3" /> Walk-ins
          </TabsTrigger>
        </TabsList>

        {/* SECTION 2 — Player list */}
        <TabsContent value="players" className="space-y-2 pt-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search player..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
            {sortedContestants.map(c => {
              const profile = c.profiles as any;
              const ci = checkinMap.get(c.id);
              const isIn = !!ci;
              const ticket = ticketMap.get(c.player_id);
              const flight = (c.tournament_flights as any)?.flight_name;
              const processing = processingIds.has(c.id);

              return (
                <div key={c.id} className="golf-card flex items-center gap-3 p-3">
                  <Avatar className="h-8 w-8">
                    {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {(profile?.full_name ?? "?").charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{profile?.full_name ?? "Unknown"}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      <Badge variant="outline" className="text-[9px] h-4 px-1">HCP {c.hcp ?? "—"}</Badge>
                      {flight && <Badge variant="outline" className="text-[9px] h-4 px-1">{flight}</Badge>}
                      {ticket && <Badge variant="outline" className="text-[9px] h-4 px-1">#{ticket}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isIn ? (
                      <>
                        <span className="text-[10px] text-primary font-medium flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          {new Date(ci.checked_in_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[10px] text-muted-foreground"
                          onClick={() => handleUndo(c.id)}
                          disabled={processing}
                        >
                          <Undo2 className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        className="h-8 px-4 text-xs gap-1"
                        onClick={() => handleCheckin(c.id)}
                        disabled={processing}
                      >
                        <Check className="h-3 w-3" /> Check In
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {sortedContestants.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No contestants found</p>
            )}
          </div>
        </TabsContent>

        {/* SECTION 3 — Walk-ins */}
        <TabsContent value="walkins" className="space-y-2 pt-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name to add walk-in..."
              value={walkinSearch}
              onChange={e => setWalkinSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            {walkinSearch.length < 2 && (
              <p className="text-xs text-muted-foreground text-center py-4">Type at least 2 characters to search</p>
            )}
            {filteredWalkins.map(p => (
              <div key={p.id} className="golf-card flex items-center gap-3 p-3">
                <Avatar className="h-8 w-8">
                  {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                  <AvatarFallback className="text-xs bg-muted">{(p.full_name ?? "?").charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{p.full_name}</p>
                  <p className="text-[10px] text-muted-foreground">HCP {p.handicap ?? "—"}</p>
                </div>
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs gap-1"
                  onClick={() => handleWalkin(p.id, p.full_name ?? "Player")}
                  disabled={processingIds.has(p.id)}
                >
                  <UserPlus className="h-3 w-3" /> Add & Check In
                </Button>
              </div>
            ))}
            {walkinSearch.length >= 2 && filteredWalkins.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No matching players found</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EventCheckin;
