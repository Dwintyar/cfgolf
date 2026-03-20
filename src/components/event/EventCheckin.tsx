import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ClipboardCheck, Search, Check, Undo2, Users, Building2 } from "lucide-react";
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
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Contestants with club info via tour_players
  const { data: contestants } = useQuery({
    queryKey: ["checkin-contestants-v2", eventId],
    queryFn: async () => {
      // Get tour_id from event
      const { data: ev } = await supabase
        .from("events")
        .select("tour_id")
        .eq("id", eventId)
        .single();
      if (!ev) return [];

      const { data, error } = await supabase
        .from("contestants")
        .select("id, player_id, hcp, flight_id, status, tournament_flights(flight_name)")
        .eq("event_id", eventId);
      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Get profiles
      const playerIds = data.map(c => c.player_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", playerIds);

      // Get tour_players for club mapping
      const { data: tourPlayers } = await supabase
        .from("tour_players")
        .select("player_id, club_id")
        .eq("tour_id", ev.tour_id)
        .in("player_id", playerIds);

      // Get clubs
      const clubIds = [...new Set((tourPlayers ?? []).map(tp => tp.club_id))];
      const { data: clubs } = clubIds.length > 0
        ? await supabase.from("clubs").select("id, name").in("id", clubIds)
        : { data: [] };

      const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
      const tpMap = new Map((tourPlayers ?? []).map(tp => [tp.player_id, tp.club_id]));
      const clubMap = new Map((clubs ?? []).map(c => [c.id, c.name]));

      return data.map(c => ({
        ...c,
        full_name: profileMap.get(c.player_id)?.full_name ?? "Unknown",
        club_id: tpMap.get(c.player_id) ?? null,
        club_name: clubMap.get(tpMap.get(c.player_id) ?? "") ?? "No Club",
        flight_name: (c.tournament_flights as any)?.flight_name ?? null,
      }));
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

  // Realtime
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

  const checkinMap = useMemo(() => {
    const map = new Map<string, any>();
    checkins?.forEach(ci => map.set(ci.contestant_id, ci));
    return map;
  }, [checkins]);

  const registeredCount = contestants?.length ?? 0;
  const checkedInCount = checkins?.length ?? 0;
  const notYetCount = registeredCount - checkedInCount;
  const progressPct = registeredCount > 0 ? (checkedInCount / registeredCount) * 100 : 0;

  // Group by club
  const clubGroups = useMemo(() => {
    if (!contestants) return [];
    let filtered = contestants;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(c => c.full_name.toLowerCase().includes(q) || c.club_name.toLowerCase().includes(q));
    }
    const groups = new Map<string, typeof filtered>();
    filtered.forEach(c => {
      const key = c.club_name;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    });
    // Sort clubs alphabetically, sort players within each club
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "id"))
      .map(([name, members]) => ({
        name,
        members: members.sort((a, b) => a.full_name.localeCompare(b.full_name, "id")),
      }));
  }, [contestants, search]);

  const uniqueClubCount = useMemo(() => {
    if (!contestants) return 0;
    return new Set(contestants.map(c => c.club_name)).size;
  }, [contestants]);

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

  const getFlightBadge = (flightName: string | null) => {
    if (!flightName) return null;
    const letter = flightName.replace(/[^A-Ca-c]/g, "").toUpperCase().charAt(0);
    if (!letter) return <Badge variant="outline" className="text-[10px] h-5 px-1.5">{flightName}</Badge>;
    const colors: Record<string, string> = {
      A: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      B: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      C: "bg-muted text-muted-foreground border-border",
    };
    return (
      <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${colors[letter] ?? ""}`}>
        {letter}
      </Badge>
    );
  };

  // ========== PLAYER VIEW ==========
  if (!isAdmin) {
    const myContestant = contestants?.find(c => c.player_id === userId);
    const myCheckin = myContestant ? checkinMap.get(myContestant.id) : null;

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
                Registered for <span className="font-medium text-foreground">{event?.name}</span>
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">HCP {myContestant.hcp ?? "—"}</Badge>
                {myContestant.flight_name && getFlightBadge(myContestant.flight_name)}
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
      {/* Summary bar */}
      <div className="golf-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" /> Check-in
          </h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {registeredCount} Players</span>
            <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {uniqueClubCount} Clubs</span>
          </div>
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search player or club..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Club-grouped tables */}
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {clubGroups.map(group => (
          <div key={group.name} className="rounded-lg border border-border overflow-hidden">
            {/* Club header */}
            <div className="bg-accent px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-accent-foreground/70" />
                <span className="text-sm font-bold text-accent-foreground">{group.name}</span>
                <span className="text-xs text-accent-foreground/60">({group.members.length})</span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="w-10 px-2 py-2 text-center text-muted-foreground font-medium">NO</th>
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium">CONTESTANT NAME</th>
                    <th className="w-14 px-2 py-2 text-center text-muted-foreground font-medium">HCP</th>
                    <th className="w-20 px-2 py-2 text-center text-muted-foreground font-medium hidden sm:table-cell">STATUS</th>
                    <th className="w-14 px-2 py-2 text-center text-muted-foreground font-medium">FLIGHT</th>
                    <th className="w-24 px-2 py-2 text-center text-muted-foreground font-medium">ATTENDANCE</th>
                    {isAdmin && <th className="w-20 px-2 py-2 text-center text-muted-foreground font-medium">ACTION</th>}
                  </tr>
                </thead>
                <tbody>
                  {group.members.map((c, idx) => {
                    const ci = checkinMap.get(c.id);
                    const isIn = !!ci;
                    const processing = processingIds.has(c.id);

                    return (
                      <tr
                        key={c.id}
                        className={`border-b border-border last:border-0 ${idx % 2 === 0 ? "bg-card" : "bg-muted/20"}`}
                      >
                        <td className="px-2 py-2 text-center text-muted-foreground font-mono">{idx + 1}</td>
                        <td className="px-3 py-2 text-foreground font-medium truncate max-w-[200px]">{c.full_name}</td>
                        <td className="px-2 py-2 text-center text-foreground font-mono">{c.hcp ?? "—"}</td>
                        <td className="px-2 py-2 text-center text-muted-foreground hidden sm:table-cell">Competitor</td>
                        <td className="px-2 py-2 text-center">{getFlightBadge(c.flight_name)}</td>
                        <td className="px-2 py-2 text-center">
                          {isIn ? (
                            <span className="inline-flex items-center gap-1 text-emerald-500 font-medium">
                              <Check className="h-3 w-3" />
                              {new Date(ci.checked_in_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-2 py-2 text-center">
                            {isIn ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[10px] text-muted-foreground"
                                onClick={() => handleUndo(c.id)}
                                disabled={processing}
                              >
                                <Undo2 className="h-3 w-3" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="h-6 px-2 text-[10px] gap-0.5"
                                onClick={() => handleCheckin(c.id)}
                                disabled={processing}
                              >
                                <Check className="h-3 w-3" /> In
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {clubGroups.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No contestants found</p>
        )}
      </div>
    </div>
  );
};

export default EventCheckin;
