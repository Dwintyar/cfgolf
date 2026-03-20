import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Download, Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  // Get all events for this tour
  const { data: events } = useQuery({
    queryKey: ["tour-lb-events", tourId],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id")
        .eq("tour_id", tourId);
      return data ?? [];
    },
  });

  const totalEvents = events?.length ?? 0;

  // Get all scorecards for contestants in this tour's events
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["tour-leaderboard", tourId, events?.map(e => e.id)],
    queryFn: async () => {
      const eventIds = events!.map(e => e.id);
      if (!eventIds.length) return [];

      // Get all contestants with their scores
      const { data: contestants } = await supabase
        .from("contestants")
        .select("player_id, event_id, hcp")
        .in("event_id", eventIds);

      if (!contestants?.length) return [];

      // Get scorecards for these events
      const { data: scorecards } = await supabase
        .from("scorecards")
        .select("player_id, gross_score, net_score, round_id, rounds!inner(id)")
        .in("player_id", [...new Set(contestants.map(c => c.player_id))]);

      // Get round_ids that belong to our events' courses
      // Alternative: use event leaderboard view
      const { data: leaderboardView } = await supabase
        .from("event_leaderboard")
        .select("player_id, event_id, total_gross, total_net, hcp")
        .in("event_id", eventIds);

      // Aggregate by player
      const playerMap: Record<string, {
        playerId: string;
        totalGross: number;
        totalNet: number;
        eventsPlayed: number;
        avgNet: number;
      }> = {};

      for (const row of leaderboardView ?? []) {
        if (!row.player_id || row.total_gross == null) continue;
        if (!playerMap[row.player_id]) {
          playerMap[row.player_id] = {
            playerId: row.player_id,
            totalGross: 0,
            totalNet: 0,
            eventsPlayed: 0,
            avgNet: 0,
          };
        }
        playerMap[row.player_id].totalGross += row.total_gross ?? 0;
        playerMap[row.player_id].totalNet += row.total_net ?? 0;
        playerMap[row.player_id].eventsPlayed += 1;
      }

      // Calculate averages
      Object.values(playerMap).forEach(p => {
        p.avgNet = p.eventsPlayed > 0 ? Math.round((p.totalNet / p.eventsPlayed) * 10) / 10 : 0;
      });

      // Get player profiles and clubs
      const playerIds = Object.keys(playerMap);
      if (!playerIds.length) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", playerIds);

      const { data: tourPlayers } = await supabase
        .from("tour_players")
        .select("player_id, clubs(name)")
        .eq("tour_id", tourId)
        .in("player_id", playerIds);

      const clubMap: Record<string, string> = {};
      for (const tp of tourPlayers ?? []) {
        clubMap[tp.player_id] = (tp.clubs as any)?.name ?? "";
      }

      const profileMap: Record<string, any> = {};
      for (const p of profiles ?? []) {
        profileMap[p.id] = p;
      }

      // Build sorted leaderboard
      return Object.values(playerMap)
        .sort((a, b) => a.totalNet - b.totalNet)
        .map((p, i) => ({
          rank: i + 1,
          ...p,
          profile: profileMap[p.playerId],
          clubName: clubMap[p.playerId] ?? "",
        }));
    },
    enabled: !!events && events.length > 0,
  });

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
          disabled={exporting || !leaderboard?.length}
        >
          {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          Export PNG
        </Button>
      </div>

      {(!leaderboard || leaderboard.length === 0) ? (
        <div className="golf-card p-6 text-center text-sm text-muted-foreground">
          No scores recorded yet
        </div>
      ) : (
        <div ref={tableRef} className="golf-card overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[2.5rem_1fr_3rem_3rem_3rem_3rem] gap-1 px-3 py-2 bg-muted/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            <span>#</span>
            <span>Player</span>
            <span className="text-center">GP</span>
            <span className="text-center">Gross</span>
            <span className="text-center">Net</span>
            <span className="text-center">Avg</span>
          </div>

          {/* Rows */}
          {leaderboard.map((row) => (
            <div
              key={row.playerId}
              className={`grid grid-cols-[2.5rem_1fr_3rem_3rem_3rem_3rem] gap-1 items-center px-3 py-2.5 border-t border-border/30 ${rankBg(row.rank)}`}
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
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{row.profile?.full_name ?? "Unknown"}</p>
                  {row.clubName && <p className="text-[10px] text-muted-foreground truncate">{row.clubName}</p>}
                </div>
              </div>
              <span className="text-center text-[11px] text-muted-foreground">
                {row.eventsPlayed}{totalEvents > 0 ? `/${totalEvents}` : ""}
              </span>
              <span className="text-center text-[11px] font-medium">{row.totalGross}</span>
              <span className="text-center text-[11px] font-bold text-primary">{row.totalNet}</span>
              <span className="text-center text-[11px] text-muted-foreground">{row.avgNet}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TourLeaderboard;
