import DesktopLayout from "@/components/DesktopLayout";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, TrendingDown, TrendingUp, Minus, Calendar, AlertTriangle, Trophy, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const PlayerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["profile", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ["handicap-history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_handicap_trend")
        .select("*")
        .eq("player_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: events } = useQuery({
    queryKey: ["handicap-events", history],
    queryFn: async () => {
      if (!history || history.length === 0) return {};
      const eventIds = [...new Set(history.map((h: any) => h.event_id))];
      const { data } = await supabase
        .from("events")
        .select("id, name, event_date")
        .in("id", eventIds);
      const map: Record<string, any> = {};
      data?.forEach((e: any) => { map[e.id] = e; });
      return map;
    },
    enabled: !!history && history.length > 0,
  });

  const isLoading = loadingProfile || loadingHistory;

  // Scorecard modal state
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [holeScores, setHoleScores] = useState<Record<number, number>>({});
  const [holeLoading, setHoleLoading] = useState(false);

  const fetchScorecard = useCallback(async (h: any) => {
    setSelectedRow(h);
    setHoleScores({});
    setHoleLoading(true);
    try {
      const { data: evInfo } = await supabase
        .from("events")
        .select("course_id, event_date")
        .eq("id", h.event_id)
        .single();
      if (!evInfo) return;

      // Try event_rounds first
      const { data: eventRounds } = await supabase
        .from("event_rounds")
        .select("round_id")
        .eq("event_id", h.event_id);

      let roundId: string | null = null;
      if (eventRounds?.length) {
        roundId = eventRounds[0].round_id;
      } else {
        const eventDate = evInfo.event_date?.slice(0, 10);
        const { data: rounds } = await supabase
          .from("rounds")
          .select("id, created_at")
          .eq("course_id", evInfo.course_id)
          .order("created_at", { ascending: false });
        const matched = rounds?.find((r: any) => r.created_at?.slice(0, 10) === eventDate) ?? rounds?.[0];
        if (matched) roundId = matched.id;
      }

      if (!roundId) return;

      const { data: sc } = await supabase
        .from("scorecards")
        .select("id")
        .eq("round_id", roundId)
        .eq("player_id", id!)
        .maybeSingle();
      if (!sc) return;

      const { data: holes } = await supabase
        .from("hole_scores")
        .select("hole_number, strokes")
        .eq("scorecard_id", sc.id)
        .order("hole_number");

      const map: Record<number, number> = {};
      (holes ?? []).forEach((hole: any) => { map[hole.hole_number] = hole.strokes; });
      setHoleScores(map);
    } finally {
      setHoleLoading(false);
    }
  }, [id]);

  if (isLoading) return (
    <DesktopLayout>
    <div className="bottom-nav-safe space-y-4 p-4">
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
    </DesktopLayout>
  );

  if (!profile) return (
    <DesktopLayout>
    <div className="bottom-nav-safe p-4 text-center text-muted-foreground">Player not found</div>
    </DesktopLayout>
  );

  // Chart data
  const chartData = (history ?? []).map((h: any, idx: number) => ({
    round: idx + 1,
    hcp: h.new_hcp,
    label: events?.[h.event_id]?.name ?? `Round ${idx + 1}`,
  }));

  const hcpChange = history && history.length >= 2
    ? (history[history.length - 1] as any).new_hcp - (history[history.length - 2] as any).new_hcp
    : 0;

  return (
    <DesktopLayout>
    <div className="bottom-nav-safe">
      {/* Header */}
      <div className="p-4">
        <button onClick={() => navigate(-1)} className="mb-2 text-xs text-muted-foreground hover:text-foreground transition-colors">← Back</button>

        <div className="golf-card p-4 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
            {profile.full_name?.charAt(0) ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg font-bold truncate">{profile.full_name ?? "Unknown"}</h1>
            <p className="text-xs text-muted-foreground">{profile.location ?? "No location"}</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge className="text-xs">HCP {profile.handicap ?? "—"}</Badge>
              {hcpChange !== 0 && (
                <span className={`flex items-center gap-0.5 text-xs ${hcpChange < 0 ? "text-primary" : "text-destructive"}`}>
                  {hcpChange < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                  {hcpChange > 0 ? "+" : ""}{hcpChange}
                </span>
              )}
              {hcpChange === 0 && history && history.length >= 2 && (
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <Minus className="h-3 w-3" /> No change
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Handicap Trend Chart */}
      {chartData.length > 1 && (
        <div className="px-4 pb-4">
          <div className="golf-card p-4">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-primary" /> Handicap Trend
            </h2>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="round"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  domain={["dataMin - 2", "dataMax + 2"]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: 12,
                    color: "hsl(var(--foreground))",
                  }}
                  formatter={(value: number) => [`HCP ${value}`, "Handicap"]}
                  labelFormatter={(label: number) => chartData[label - 1]?.label ?? `Round ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="hcp"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Riwayat Handicap Table */}
      <div className="px-4 pb-4">
        <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" /> Tournament History
        </h2>
        {(!history || history.length === 0) && (
          <div className="golf-card p-6 text-center text-sm text-muted-foreground">No tournament history yet</div>
        )}
        <div className="space-y-1.5">
          {/* Header */}
          {history && history.length > 0 && (
            <div className="grid grid-cols-[1fr_3rem_3rem_3rem_3rem_1.5rem] gap-1 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Event</span>
              <span className="text-right">Gross</span>
              <span className="text-right">Net</span>
              <span className="text-right">Old</span>
              <span className="text-right">New</span>
              <span></span>
            </div>
          )}
          {(history ?? []).slice().reverse().map((h: any, idx: number) => {
            const ev = events?.[h.event_id];
            const hcpDiff = (h.new_hcp ?? 0) - (h.old_hcp ?? 0);
            return (
              <div
                key={h.event_id + h.created_at}
                onClick={() => fetchScorecard(h)}
                className={`golf-card grid grid-cols-[1fr_3rem_3rem_3rem_3rem_1.5rem] items-center gap-1 px-3 py-2.5 animate-fade-in cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors ${h.sandbagging_flag ? "border-destructive/30" : ""}`}
                style={{ animationDelay: `${idx * 30}ms` }}
                title="Click to view scorecard"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{ev?.name ?? "Event"}</p>
                  <p className="text-[10px] text-muted-foreground">{ev?.event_date ?? ""}</p>
                </div>
                <span className="text-right text-xs tabular-nums">{h.gross_score ?? "—"}</span>
                <span className="text-right text-xs tabular-nums font-medium">{h.net_score ?? "—"}</span>
                <span className="text-right text-xs tabular-nums text-muted-foreground">{h.old_hcp ?? "—"}</span>
                <span className={`text-right text-xs tabular-nums font-bold ${hcpDiff < 0 ? "text-primary" : hcpDiff > 0 ? "text-destructive" : ""}`}>
                  {h.new_hcp ?? "—"}
                </span>
                <div className="flex justify-center">
                  {h.sandbagging_flag
                    ? <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    : <ClipboardList className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary" />
                  }
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>

      {/* ── SCORECARD MODAL ── */}
      {selectedRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedRow(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start gap-3 px-5 py-4 border-b border-border/50">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground truncate">
                  {events?.[selectedRow.event_id]?.name ?? "Event"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {events?.[selectedRow.event_id]?.event_date ?? ""}
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Gross</p>
                  <p className="text-xl font-bold tabular-nums">{selectedRow.gross_score ?? "—"}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-primary/70 uppercase">Net</p>
                  <p className="text-2xl font-extrabold text-primary tabular-nums">{selectedRow.net_score ?? "—"}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">HCP</p>
                  <p className="text-xl font-bold tabular-nums">{selectedRow.old_hcp ?? "—"} → <span className={`${(selectedRow.new_hcp - selectedRow.old_hcp) < 0 ? "text-primary" : "text-destructive"}`}>{selectedRow.new_hcp ?? "—"}</span></p>
                </div>
                <button
                  onClick={() => setSelectedRow(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none ml-1"
                >✕</button>
              </div>
            </div>

            {/* Scorecard body */}
            <div className="px-5 py-4">
              {holeLoading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                  <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <span className="text-sm">Loading scorecard…</span>
                </div>
              ) : Object.keys(holeScores).length > 0 ? (
                <div className="space-y-3">
                  {[{ holes: [1,2,3,4,5,6,7,8,9], label: "OUT" }, { holes: [10,11,12,13,14,15,16,17,18], label: "IN" }].map(({ holes, label }) => (
                    <div key={label} className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse font-mono">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left py-1.5 px-2 text-muted-foreground font-semibold">Hole</th>
                            {holes.map(h => <th key={h} className="text-center py-1.5 px-1 text-muted-foreground w-8">{h}</th>)}
                            <th className="text-center py-1.5 px-1 font-bold w-10">{label}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t border-border/50">
                            <td className="py-1.5 px-2 text-muted-foreground">Score</td>
                            {holes.map(h => (
                              <td key={h} className="text-center py-1.5 px-1 tabular-nums">
                                {holeScores[h] ?? <span className="text-muted-foreground/30">—</span>}
                              </td>
                            ))}
                            <td className="text-center py-1.5 px-1 font-bold tabular-nums">
                              {holes.reduce((s, h) => s + (holeScores[h] ?? 0), 0) || "—"}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ))}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/50">
                    {[
                      { label: "OUT", val: [1,2,3,4,5,6,7,8,9].reduce((s,h) => s+(holeScores[h]??0),0) },
                      { label: "IN",  val: [10,11,12,13,14,15,16,17,18].reduce((s,h) => s+(holeScores[h]??0),0) },
                      { label: "GROSS", val: selectedRow.gross_score, highlight: true },
                    ].map(({ label, val, highlight }) => (
                      <div key={label} className={`text-center rounded-xl py-2 ${highlight ? "bg-primary/10 border border-primary/20" : "bg-muted/50"}`}>
                        <p className={`text-[10px] uppercase font-semibold ${highlight ? "text-primary/70" : "text-muted-foreground"}`}>{label}</p>
                        <p className={`text-lg font-bold tabular-nums ${highlight ? "text-primary" : ""}`}>{val || "—"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No hole-by-hole data available</p>
                  <p className="text-xs mt-1 text-muted-foreground/50">
                    Gross: {selectedRow.gross_score ?? "—"} · Net: {selectedRow.net_score ?? "—"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DesktopLayout>
  );
};

export default PlayerProfile;
