import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { User, TrendingDown, TrendingUp, Minus, Calendar, AlertTriangle, Trophy } from "lucide-react";
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

  if (isLoading) return (
    <div className="bottom-nav-safe space-y-4 p-4">
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );

  if (!profile) return (
    <div className="bottom-nav-safe p-4 text-center text-muted-foreground">Player not found</div>
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

      {/* Handicap History Table */}
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
                className={`golf-card grid grid-cols-[1fr_3rem_3rem_3rem_3rem_1.5rem] items-center gap-1 px-3 py-2.5 animate-fade-in ${h.sandbagging_flag ? "border-destructive/30" : ""}`}
                style={{ animationDelay: `${idx * 30}ms` }}
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
                  {h.sandbagging_flag && (
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile;
