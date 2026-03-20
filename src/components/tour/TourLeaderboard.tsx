import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Download, Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface Props {
  tourId: string;
  tourName: string;
}

const TourLeaderboard = ({ tourId, tourName }: Props) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["tour-leaderboard-v2", tourId],
    queryFn: async () => {
      // 1. Get completed events for this tour
      const { data: events } = await supabase
        .from("events")
        .select("id, course_id")
        .eq("tour_id", tourId)
        .eq("status", "completed");

      const completedEvents = events ?? [];
      if (!completedEvents.length) return { rows: [], totalEvents: 0 };

      // 2. Get tour players with club info
      const { data: tourPlayers } = await supabase
        .from("tour_players")
        .select("player_id, clubs(name)")
        .eq("tour_id", tourId);

      const playerClubMap: Record<string, string> = {};
      const tourPlayerIds = new Set<string>();
      (tourPlayers ?? []).forEach((tp: any) => {
        playerClubMap[tp.player_id] = (tp.clubs as any)?.name ?? "";
        tourPlayerIds.add(tp.player_id);
      });

      if (!tourPlayerIds.size) return { rows: [], totalEvents: completedEvents.length };

      // 3. Get rounds linked to event courses
      const courseIds = [...new Set(completedEvents.map(e => e.course_id))];
      const { data: rounds } = await supabase
        .from("rounds")
        .select("id, course_id")
        .in("course_id", courseIds);

      const roundIds = (rounds ?? []).map(r => r.id);
      if (!roundIds.length) return { rows: [], totalEvents: completedEvents.length };

      // Map course_id -> event_ids for matching
      const courseEventMap: Record<string, string[]> = {};
      completedEvents.forEach(e => {
        if (!courseEventMap[e.course_id]) courseEventMap[e.course_id] = [];
        courseEventMap[e.course_id].push(e.id);
      });
      const roundCourseMap: Record<string, string> = {};
      (rounds ?? []).forEach(r => { roundCourseMap[r.id] = r.course_id; });

      // 4. Get scorecards for tour players in those rounds
      const { data: scorecards } = await supabase
        .from("scorecards")
        .select("player_id, gross_score, net_score, round_id")
        .in("round_id", roundIds)
        .in("player_id", [...tourPlayerIds]);

      // 5. Aggregate
      const playerMap: Record<string, {
        totalGross: number; totalNet: number; eventsPlayed: Set<string>;
      }> = {};

      for (const sc of scorecards ?? []) {
        if (sc.gross_score == null || sc.net_score == null) continue;
        const courseId = roundCourseMap[sc.round_id];
        const eventIds = courseId ? (courseEventMap[courseId] ?? []) : [];
        if (!eventIds.length) continue;
        if (!tourPlayerIds.has(sc.player_id)) continue;

        if (!playerMap[sc.player_id]) {
          playerMap[sc.player_id] = { totalGross: 0, totalNet: 0, eventsPlayed: new Set() };
        }
        playerMap[sc.player_id].totalGross += sc.gross_score;
        playerMap[sc.player_id].totalNet += sc.net_score;
        eventIds.forEach(eid => playerMap[sc.player_id].eventsPlayed.add(eid));
      }

      // 6. Get profiles
      const playerIds = Object.keys(playerMap);
      if (!playerIds.length) return { rows: [], totalEvents: completedEvents.length };

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, handicap")
        .in("id", playerIds);

      const profileMap: Record<string, any> = {};
      (profiles ?? []).forEach(p => { profileMap[p.id] = p; });

      const rows = Object.entries(playerMap)
        .map(([pid, d]) => ({
          playerId: pid,
          totalGross: d.totalGross,
          totalNet: d.totalNet,
          eventsPlayed: d.eventsPlayed.size,
          avgNet: d.eventsPlayed.size > 0 ? Math.round((d.totalNet / d.eventsPlayed.size) * 10) / 10 : 0,
          profile: profileMap[pid],
          clubName: playerClubMap[pid] ?? "",
          handicap: profileMap[pid]?.handicap ?? null,
        }))
        .sort((a, b) => a.totalNet - b.totalNet)
        .map((r, i) => ({ ...r, rank: i + 1 }));

      return { rows, totalEvents: completedEvents.length };
    },
  });

  const rows = leaderboard?.rows ?? [];
  const totalEvents = leaderboard?.totalEvents ?? 0;

  const exportPNG = async () => {
    if (!tableRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(tableRef.current, { backgroundColor: null, scale: 2 });
      const link = document.createElement("a");
      const date = new Date().toISOString().split("T")[0];
      link.download = `${tourName.replace(/\s+/g, "-")}-Leaderboard-${date}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Leaderboard exported!");
    } catch {
      toast.error("Export failed");
    }
    setExporting(false);
  };

  const getInitials = (name: string | null) =>
    name ? name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() : "?";

  const rankBg = (rank: number) => {
    if (rank === 1) return "bg-yellow-500/10 border-l-2 border-l-yellow-500";
    if (rank === 2) return "bg-slate-300/10 border-l-2 border-l-slate-400";
    if (rank === 3) return "bg-amber-700/10 border-l-2 border-l-amber-600";
    return "";
  };

  const getFlightLevel = (hcp: number | null) => {
    if (hcp == null) return null;
    if (hcp <= 16) return { label: "A", cls: "bg-blue-500/10 text-blue-600 border-blue-500/30" };
    if (hcp <= 22) return { label: "B", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30" };
    return { label: "C", cls: "bg-muted text-muted-foreground border-border" };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Tour Standings</h3>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-[11px]"
          onClick={exportPNG}
          disabled={exporting || !rows.length}
        >
          {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          Export PNG
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="golf-card p-6 text-center text-sm text-muted-foreground">
          No scores recorded yet
        </div>
      ) : (
        <div ref={tableRef} className="golf-card overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[2.5rem_1fr_3rem_3rem_3rem] gap-1 px-3 py-2 bg-muted/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            <span>#</span>
            <span>Player</span>
            <span className="text-center">GP</span>
            <span className="text-center">Net</span>
            <span className="text-center">Avg</span>
          </div>

          {rows.map((row) => {
            const level = getFlightLevel(row.handicap);
            return (
              <div
                key={row.playerId}
                className={`grid grid-cols-[2.5rem_1fr_3rem_3rem_3rem] gap-1 items-center px-3 py-2.5 border-t border-border/30 ${rankBg(row.rank)}`}
              >
                <span className="text-sm font-bold text-foreground flex items-center gap-1">
                  {row.rank <= 3 && <Trophy className={`h-3 w-3 ${row.rank === 1 ? "text-yellow-500" : row.rank === 2 ? "text-slate-400" : "text-amber-600"}`} />}
                  {row.rank > 3 && row.rank}
                </span>
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={row.profile?.avatar_url ?? ""} />
                    <AvatarFallback className="bg-secondary text-[9px] font-bold">
                      {getInitials(row.profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-semibold truncate">{row.profile?.full_name ?? "Unknown"}</p>
                      {level && (
                        <Badge variant="outline" className={`text-[8px] px-1 py-0 shrink-0 ${level.cls}`}>
                          {level.label}
                        </Badge>
                      )}
                    </div>
                    {row.clubName && <p className="text-[10px] text-muted-foreground truncate">{row.clubName}</p>}
                  </div>
                </div>
                <span className="text-center text-[11px] text-muted-foreground">
                  {row.eventsPlayed}{totalEvents > 0 ? `/${totalEvents}` : ""}
                </span>
                <span className="text-center text-[11px] font-bold text-primary">{row.totalNet}</span>
                <span className="text-center text-[11px] text-muted-foreground">{row.avgNet}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TourLeaderboard;
