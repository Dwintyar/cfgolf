import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Building2, Calendar, Trophy, Activity, TrendingUp, BarChart3, Award,
  MessageSquare, UserCheck, MapPin, Dumbbell, Plus, Bell, Clock, ChevronRight
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedClubId, setSelectedClubId] = useState<string>("all");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Get clubs user manages
  const { data: myClubs } = useQuery({
    queryKey: ["admin-my-clubs", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("members")
        .select("club_id, role, clubs(id, name)")
        .eq("user_id", userId!)
        .in("role", ["owner", "admin"]);
      return data ?? [];
    },
    enabled: !!userId,
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, clubs, events, tours, contestants, checkins, pairings, results, buddies, convos, teeBookings, rangeBays] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("clubs").select("id, is_personal, facility_type", { count: "exact" }),
        supabase.from("events").select("id, status", { count: "exact" }),
        supabase.from("tours").select("id", { count: "exact", head: true }),
        supabase.from("contestants").select("id", { count: "exact", head: true }),
        supabase.from("event_checkins").select("id", { count: "exact", head: true }),
        supabase.from("pairings").select("id", { count: "exact", head: true }),
        supabase.from("event_results").select("id", { count: "exact", head: true }),
        supabase.from("buddy_connections").select("id", { count: "exact", head: true }),
        supabase.from("conversations").select("id", { count: "exact", head: true }),
        supabase.from("tee_time_bookings").select("id", { count: "exact", head: true }),
        supabase.from("range_bays").select("id", { count: "exact", head: true }),
      ]);

      const golfClubs = clubs.data?.filter(c => !c.is_personal && (c as any).facility_type === 'golf_club').length ?? 0;
      const drivingRanges = clubs.data?.filter(c => (c as any).facility_type === 'driving_range').length ?? 0;
      const eventsByStatus: Record<string, number> = {};
      events.data?.forEach((e: any) => {
        eventsByStatus[e.status] = (eventsByStatus[e.status] || 0) + 1;
      });

      return {
        totalUsers: users.count ?? 0,
        totalClubs: clubs.count ?? 0,
        golfClubs,
        drivingRanges,
        totalEvents: events.count ?? 0,
        totalTours: tours.count ?? 0,
        totalContestants: contestants.count ?? 0,
        totalCheckins: checkins.count ?? 0,
        totalPairings: pairings.count ?? 0,
        totalResults: results.count ?? 0,
        totalBuddies: buddies.count ?? 0,
        totalConversations: convos.count ?? 0,
        totalTeeBookings: teeBookings.count ?? 0,
        totalRangeBays: rangeBays.count ?? 0,
        eventsByStatus,
      };
    },
  });

  // Pending actions
  const { data: pendingInvitations } = useQuery({
    queryKey: ["admin-pending-invitations"],
    queryFn: async () => {
      const { count } = await supabase.from("club_invitations").select("id", { count: "exact", head: true }).eq("status", "pending");
      return count ?? 0;
    },
  });

  const { data: pendingBuddies } = useQuery({
    queryKey: ["admin-pending-buddies"],
    queryFn: async () => {
      const { count } = await supabase.from("buddy_connections").select("id", { count: "exact", head: true }).eq("status", "pending");
      return count ?? 0;
    },
  });

  const { data: draftEvents } = useQuery({
    queryKey: ["admin-draft-events"],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("id, name").eq("status", "draft").limit(5);
      return data ?? [];
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

  // Recent activity from audit_log
  const { data: recentActivity } = useQuery({
    queryKey: ["admin-activity"],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
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
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bottom-nav-safe">
      <AppHeader title="Admin Dashboard" />
      <div className="space-y-5 p-4">

        {/* Club Selector */}
        {myClubs && myClubs.length > 0 && (
          <Select value={selectedClubId} onValueChange={setSelectedClubId}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Select club to manage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clubs (Overview)</SelectItem>
              {myClubs.map((m: any) => (
                <SelectItem key={m.club_id} value={m.club_id}>
                  {(m.clubs as any)?.name ?? "Club"} ({m.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Primary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Users} label="Total Users" value={stats?.totalUsers ?? 0} />
          <StatCard icon={Building2} label="Golf Clubs" value={stats?.golfClubs ?? 0} sub={`${stats?.drivingRanges ?? 0} ranges · ${stats?.totalClubs ?? 0} total`} color="text-accent" />
          <StatCard icon={Trophy} label="Tours" value={stats?.totalTours ?? 0} />
          <StatCard icon={Calendar} label="Events" value={stats?.totalEvents ?? 0} />
          <StatCard icon={UserCheck} label="Buddies" value={stats?.totalBuddies ?? 0} color="text-accent" />
          <StatCard icon={MessageSquare} label="Conversations" value={stats?.totalConversations ?? 0} />
          <StatCard icon={MapPin} label="Tee Bookings" value={stats?.totalTeeBookings ?? 0} color="text-accent" />
          <StatCard icon={Dumbbell} label="Range Bays" value={stats?.totalRangeBays ?? 0} />
        </div>

        {/* Pending Actions */}
        {((pendingInvitations ?? 0) > 0 || (pendingBuddies ?? 0) > 0 || (draftEvents?.length ?? 0) > 0) && (
          <div>
            <h2 className="font-display text-sm font-semibold mb-2 flex items-center gap-2">
              <Bell className="h-4 w-4 text-accent" /> Pending Actions
            </h2>
            <div className="space-y-2">
              {(pendingInvitations ?? 0) > 0 && (
                <div className="golf-card p-3 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
                    <Users className="h-4 w-4 text-accent" />
                  </div>
                  <p className="text-sm flex-1">{pendingInvitations} club invitations pending</p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              {(pendingBuddies ?? 0) > 0 && (
                <div className="golf-card p-3 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <UserCheck className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-sm flex-1">{pendingBuddies} buddy requests pending</p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              {draftEvents?.map(evt => (
                <button key={evt.id} onClick={() => navigate(`/event/${evt.id}`)} className="golf-card p-3 flex items-center gap-3 w-full text-left hover:border-primary/30 transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm flex-1">"{evt.name}" needs setup</p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="font-display text-sm font-semibold mb-2">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="h-10 gap-1 text-xs justify-start" onClick={() => navigate("/clubs")}>
              <Plus className="h-3.5 w-3.5" /> Invite Member
            </Button>
            <Button variant="outline" size="sm" className="h-10 gap-1 text-xs justify-start" onClick={() => navigate("/tour")}>
              <Plus className="h-3.5 w-3.5" /> Create Event
            </Button>
            <Button variant="outline" size="sm" className="h-10 gap-1 text-xs justify-start" onClick={() => navigate("/clubs")}>
              <Users className="h-3.5 w-3.5" /> Manage Staff
            </Button>
            <Button variant="outline" size="sm" className="h-10 gap-1 text-xs justify-start" onClick={() => navigate("/export-queries")}>
              <BarChart3 className="h-3.5 w-3.5" /> View Reports
            </Button>
          </div>
        </div>

        {/* Tournament Activity */}
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

        {/* Recent Activity */}
        {recentActivity && recentActivity.length > 0 && (
          <div>
            <h2 className="font-display text-sm font-semibold mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Recent Activity
            </h2>
            <div className="space-y-2">
              {recentActivity.map((a: any) => (
                <div key={a.id} className="golf-card p-3 flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                    <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{a.action} on {a.target_table}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
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
      </div>
    </div>
  );
};

export default AdminDashboard;
