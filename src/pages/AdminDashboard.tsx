import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Building2, Calendar, Trophy, Activity, TrendingUp, BarChart3, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";

const StatCard = ({ icon: Icon, label, value, sub, color = "text-primary" }: {
  icon: any; label: string; value: string | number; sub?: string; color?: string;
}) => (
  <div className="golf-card p-4 space-y-1">
    <Icon className={`h-5 w-5 ${color}`} />
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
    {sub && <p className="text-[10px] text-muted-foreground/70">{sub}</p>}
  </div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, clubs, events, tours, contestants, checkins, pairings, results] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("clubs").select("id, is_personal", { count: "exact" }),
        supabase.from("events").select("id, status", { count: "exact" }),
        supabase.from("tours").select("id", { count: "exact", head: true }),
        supabase.from("contestants").select("id", { count: "exact", head: true }),
        supabase.from("event_checkins").select("id", { count: "exact", head: true }),
        supabase.from("pairings").select("id", { count: "exact", head: true }),
        supabase.from("event_results").select("id", { count: "exact", head: true }),
      ]);

      const golfClubs = clubs.data?.filter(c => !c.is_personal).length ?? 0;
      const eventsByStatus: Record<string, number> = {};
      events.data?.forEach((e: any) => {
        eventsByStatus[e.status] = (eventsByStatus[e.status] || 0) + 1;
      });

      return {
        totalUsers: users.count ?? 0,
        totalClubs: clubs.count ?? 0,
        golfClubs,
        totalEvents: events.count ?? 0,
        totalTours: tours.count ?? 0,
        totalContestants: contestants.count ?? 0,
        totalCheckins: checkins.count ?? 0,
        totalPairings: pairings.count ?? 0,
        totalResults: results.count ?? 0,
        eventsByStatus,
      };
    },
  });

  const { data: recentEvents } = useQuery({
    queryKey: ["admin-recent-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, event_date, status, courses(name), tours(name)")
        .order("event_date", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  const { data: topClubs } = useQuery({
    queryKey: ["admin-top-clubs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("id, name, is_personal")
        .eq("is_personal", false)
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const statusColors: Record<string, string> = {
    draft: "text-muted-foreground border-muted-foreground/30",
    registration: "text-accent border-accent/30",
    checkin: "text-accent border-accent/30",
    playing: "text-primary border-primary/30",
    completed: "text-primary border-primary/60",
  };

  if (isLoading) return (
    <div className="bottom-nav-safe">
      <AppHeader title="Admin Dashboard" />
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bottom-nav-safe">
      <AppHeader title="Admin Dashboard" />
      <div className="space-y-5 p-4">
        {/* Primary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Users} label="Total Users" value={stats?.totalUsers ?? 0} />
          <StatCard icon={Building2} label="Golf Clubs" value={stats?.golfClubs ?? 0} sub={`${stats?.totalClubs ?? 0} total incl. personal`} color="text-accent" />
          <StatCard icon={Trophy} label="Tours" value={stats?.totalTours ?? 0} />
          <StatCard icon={Calendar} label="Events" value={stats?.totalEvents ?? 0} />
        </div>

        {/* Activity Stats */}
        <div>
          <h2 className="font-display text-sm font-semibold mb-2 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Tournament Activity
          </h2>
          <div className="grid grid-cols-4 gap-2">
            <div className="golf-card p-3 text-center">
              <p className="text-lg font-bold">{stats?.totalContestants ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Contestants</p>
            </div>
            <div className="golf-card p-3 text-center">
              <p className="text-lg font-bold">{stats?.totalCheckins ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Check-ins</p>
            </div>
            <div className="golf-card p-3 text-center">
              <p className="text-lg font-bold">{stats?.totalPairings ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Pairings</p>
            </div>
            <div className="golf-card p-3 text-center">
              <p className="text-lg font-bold">{stats?.totalResults ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Results</p>
            </div>
          </div>
        </div>

        {/* Event Status Breakdown */}
        {stats?.eventsByStatus && Object.keys(stats.eventsByStatus).length > 0 && (
          <div>
            <h2 className="font-display text-sm font-semibold mb-2 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Events by Status
            </h2>
            <div className="golf-card p-4 flex flex-wrap gap-3">
              {Object.entries(stats.eventsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] ${statusColors[status] ?? ""}`}>{status}</Badge>
                  <span className="text-sm font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Events */}
        <div>
          <h2 className="font-display text-sm font-semibold mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Recent Events
          </h2>
          <div className="space-y-2">
            {recentEvents?.map((e) => (
              <button
                key={e.id}
                onClick={() => navigate(`/event/${e.id}`)}
                className="golf-card w-full text-left p-3 flex items-center justify-between hover:border-primary/30 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{e.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.event_date} · {(e.courses as any)?.name}
                  </p>
                </div>
                <Badge variant="outline" className={`text-[10px] shrink-0 ml-2 ${statusColors[e.status] ?? ""}`}>
                  {e.status}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        {/* Top Clubs */}
        <div>
          <h2 className="font-display text-sm font-semibold mb-2 flex items-center gap-2">
            <Award className="h-4 w-4 text-accent" /> Clubs
          </h2>
          <div className="space-y-2">
            {topClubs?.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/clubs/${c.id}`)}
                className="golf-card w-full text-left p-3 hover:border-primary/30 transition-colors"
              >
                <p className="text-sm font-medium">{c.name}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
