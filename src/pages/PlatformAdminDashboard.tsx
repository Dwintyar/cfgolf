import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Building2, Calendar, MapPin, BarChart3, Search, Shield, Eye, Trash2,
  ChevronRight, Plus, CheckCircle, Filter, TrendingUp, Trophy, Flag, ToggleLeft, ToggleRight
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { toast } from "sonner";

const formatIDR = (n: number | null) =>
  n != null ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n) : "—";

const StatCard = ({ icon: Icon, label, value, color = "text-primary" }: {
  icon: any; label: string; value: string | number; color?: string;
}) => (
  <div className="golf-card p-4 space-y-1">
    <Icon className={`h-5 w-5 ${color}`} />
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

const FeatureFlagsTab = () => {
  const queryClient = useQueryClient();

  const { data: flags, isLoading } = useQuery({
    queryKey: ["feature_flags"],
    queryFn: async () => {
      const { data } = await supabase.from("feature_flags").select("*").order("key");
      return data ?? [];
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("feature_flags")
        .update({ enabled, updated_by: "platform_admin" })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature_flags"] });
      toast.success("Feature flag updated");
    },
    onError: () => toast.error("Gagal update feature flag"),
  });

  const groupColors: Record<string, string> = {
    venue_booking: "text-orange-400",
    caddy_assignment: "text-blue-400",
    staff_join_request: "text-purple-400",
    invoice_download: "text-green-400",
    tee_time_picker: "text-cyan-400",
    venue_schedule_admin: "text-rose-400",
  };

  if (isLoading) return <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>;

  const activeCount = (flags ?? []).filter((f: any) => f.enabled).length;
  const totalCount = (flags ?? []).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="golf-card p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Fitur Aktif</p>
          <p className="text-2xl font-bold">{activeCount} <span className="text-sm font-normal text-muted-foreground">/ {totalCount}</span></p>
        </div>
        <div className={`h-12 w-12 rounded-full flex items-center justify-center ${activeCount === 0 ? "bg-muted" : "bg-primary/10"}`}>
          <ToggleRight className={`h-6 w-6 ${activeCount === 0 ? "text-muted-foreground" : "text-primary"}`} />
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
          🚦 Platform saat ini dalam mode <strong>Logbook</strong>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Aktifkan fitur satu per satu setelah caddy dan venue siap bergabung. Perubahan langsung berlaku tanpa redeploy.
        </p>
      </div>

      {/* Flag list */}
      <div className="space-y-2">
        {(flags ?? []).map((flag: any) => (
          <div key={flag.key} className="golf-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${groupColors[flag.key] ?? "text-foreground"}`}>
                    {flag.label}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    flag.enabled
                      ? "bg-green-500/15 text-green-500"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {flag.enabled ? "ON" : "OFF"}
                  </span>
                </div>
                {flag.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{flag.description}</p>
                )}
                {flag.updated_at && (
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    Diupdate: {new Date(flag.updated_at).toLocaleString("id-ID")}
                  </p>
                )}
              </div>
              <Switch
                checked={flag.enabled}
                onCheckedChange={(checked) => toggle.mutate({ key: flag.key, enabled: checked })}
                disabled={toggle.isPending}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-center text-muted-foreground pb-4">
        Hanya platform admin yang dapat mengakses halaman ini
      </p>
    </div>
  );
};

const PlatformAdminDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("users");
  const [userSearch, setUserSearch] = useState("");
  const [userSort, setUserSort] = useState<"name" | "date_asc" | "date_desc" | "hcp">("name");
  const [eventStatusFilter, setEventStatusFilter] = useState("all");
  const [userLetter, setUserLetter] = useState("A");
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<any>(null);
  const [mergeSearch, setMergeSearch] = useState("");
  const [mergeResults, setMergeResults] = useState<any[]>([]);
  const [merging, setMerging] = useState(false);
  const [processingClaimId, setProcessingClaimId] = useState<string | null>(null);

  const { data: claimRequests, refetch: refetchClaims } = useQuery({
    queryKey: ["admin-claim-requests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profile_claim_requests")
        .select("*, claimant:claimant_id(full_name, avatar_url), target:target_profile_id(full_name, handicap, location)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const pendingClaimsCount = claimRequests?.filter((c: any) => c.status === "pending").length ?? 0;

  const handleApproveClaim = async (claim: any) => {
    setProcessingClaimId(claim.id);
    try {
      // Run merge: move all data from target to claimant
      const oldId = claim.target_profile_id;
      const newId = claim.claimant_id;
      await Promise.all([
        supabase.from("contestants").update({ player_id: newId }).eq("player_id", oldId),
        supabase.from("tour_players").update({ player_id: newId }).eq("player_id", oldId),
        supabase.from("handicap_history").update({ player_id: newId }).eq("player_id", oldId),
        supabase.from("scorecards").update({ player_id: newId }).eq("player_id", oldId),
        supabase.from("members").update({ user_id: newId }).eq("user_id", oldId),
        supabase.from("round_players").update({ user_id: newId }).eq("user_id", oldId),
      ]);
      // Update claim status
      await supabase.from("profile_claim_requests")
        .update({ status: "approved", admin_note: "Data turnamen berhasil digabung" })
        .eq("id", claim.id);
      // Notify claimant
      await supabase.from("notifications").insert({
        user_id: claim.claimant_id,
        title: "Klaim Disetujui ✅",
        message: `Data turnamen atas nama "${(claim.target as any)?.full_name}" berhasil digabung ke akun Anda.`,
        type: "system",
      });
      toast.success("Klaim disetujui, data berhasil digabung");
      refetchClaims();
    } catch (e: any) {
      toast.error(e.message || "Gagal memproses klaim");
    } finally {
      setProcessingClaimId(null);
    }
  };

  const handleRejectClaim = async (claimId: string, claimantId: string, adminNote: string) => {
    setProcessingClaimId(claimId);
    await supabase.from("profile_claim_requests")
      .update({ status: "rejected", admin_note: adminNote })
      .eq("id", claimId);
    await supabase.from("notifications").insert({
      user_id: claimantId,
      title: "Klaim Ditolak",
      message: `Klaim profil tidak dapat disetujui. ${adminNote ? `Alasan: ${adminNote}` : "Hubungi admin untuk informasi lebih lanjut."}`,
      type: "system",
    });
    toast.success("Klaim ditolak");
    setProcessingClaimId(null);
    refetchClaims();
  };

  // KPI Stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ["platform-admin-stats"],
    queryFn: async () => {
      const [users, clubs, events, venues, tours] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("clubs").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("tours").select("id", { count: "exact", head: true }),
      ]);
      return {
        totalUsers: users.count ?? 0,
        totalClubs: clubs.count ?? 0,
        totalEvents: events.count ?? 0,
        totalVenues: venues.count ?? 0,
        totalTours: tours.count ?? 0,
      };
    },
  });

  // --- Pending Approvals ---
  const { data: pendingApprovals } = useQuery({
    queryKey: ["admin-pending-approvals-dashboard"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pending_approvals")
        .select("id, user_id, email, full_name, requested_at, status")
        .eq("status", "pending")
        .order("requested_at", { ascending: true });
      return { data: data ?? [], count: count ?? 0 };
    },
    refetchInterval: 30000,
  });

  // --- Tab: Users ---
  const { data: allUsers } = useQuery({
    queryKey: ["admin-users", userSearch, userSort, userLetter],
    queryFn: async () => {
      const sortMap = {
        name: { col: "full_name", asc: true },
        date_asc: { col: "created_at", asc: true },
        date_desc: { col: "created_at", asc: false },
        hcp: { col: "handicap", asc: true },
      };
      const { col, asc } = sortMap[userSort];
      let q = supabase.from("profiles").select("*").order(col, { ascending: asc });
      if (userSearch) {
        q = q.ilike("full_name", `%${userSearch}%`);
      } else {
        q = q.ilike("full_name", `${userLetter}%`);
      }
      const { data } = await q;
      return { data: data ?? [], count: data?.length ?? 0 };
    },
  });

  const { data: systemAdmins } = useQuery({
    queryKey: ["admin-system-admins"],
    queryFn: async () => {
      const { data } = await supabase.from("system_admins").select("user_id, admin_level").eq("is_active", true);
      return data ?? [];
    },
  });

  const getAdminBadge = (userId: string) => {
    const admin = systemAdmins?.find(a => a.user_id === userId);
    if (!admin) return null;
    const colors: Record<string, string> = {
      super_admin: "bg-destructive/10 text-destructive border-destructive/30",
      moderator: "bg-accent/10 text-accent border-accent/30",
      support: "bg-primary/10 text-primary border-primary/30",
    };
    return <Badge variant="outline" className={`text-[9px] ${colors[admin.admin_level] ?? ""}`}>{admin.admin_level}</Badge>;
  };

  const handleGrantModerator = async (userId: string) => {
    const { error } = await supabase.from("system_admins").insert({
      user_id: userId, admin_level: "moderator", is_active: true, notes: "Granted via admin dashboard",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Moderator role granted");
    queryClient.invalidateQueries({ queryKey: ["admin-system-admins"] });
  };

  // --- Tab: Clubs ---
  const { data: allClubs } = useQuery({
    queryKey: ["admin-clubs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clubs")
        .select("*, members(id)")
        
        .order("name");
      return data ?? [];
    },
  });

  const handleVerifyClub = async (clubId: string) => {
    await supabase.from("clubs").update({ is_verified: true }).eq("id", clubId);
    toast.success("Club verified!");
    queryClient.invalidateQueries({ queryKey: ["admin-clubs"] });
  };

  // --- Tab: Tours ---
  const { data: allTours } = useQuery({
    queryKey: ["admin-tours"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tours")
        .select("*, clubs(name), events(id)")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  // --- Tab: Events ---
  const { data: allEvents } = useQuery({
    queryKey: ["admin-events", eventStatusFilter],
    queryFn: async () => {
      let q = supabase.from("events").select("*, courses(name), tours(name), contestants(id)").order("event_date", { ascending: false }).limit(50);
      if (eventStatusFilter !== "all") q = q.eq("status", eventStatusFilter);
      const { data } = await q;
      return data ?? [];
    },
  });

  // --- Tab: Venues ---
  const { data: allCourses } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*, clubs(name)").order("name");
      return data ?? [];
    },
  });

  // --- Tab: Reports ---
  const { data: usersByMonth } = useQuery({
    queryKey: ["admin-report-users"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("created_at").order("created_at");
      if (!data) return [];
      const months: Record<string, number> = {};
      data.forEach(p => {
        const m = p.created_at.slice(0, 7);
        months[m] = (months[m] || 0) + 1;
      });
      return Object.entries(months).slice(-6).map(([month, count]) => ({ month, count }));
    },
  });

  const handleMergeSearch = async (q: string) => {
    setMergeSearch(q);
    if (q.trim().length < 2) { setMergeResults([]); return; }
    const { data } = await supabase.from("profiles")
      .select("id, full_name, handicap, created_at, email")
      .ilike("full_name", `%${q.trim()}%`)
      .limit(10);
    setMergeResults((data ?? []).filter(p => p.id !== mergeTarget?.id));
  };

  const handleMerge = async (oldProfileId: string, oldName: string) => {
    if (!mergeTarget || merging) return;
    setMerging(true);
    try {
      const updates = [
        supabase.from("contestants").update({ player_id: mergeTarget.id }).eq("player_id", oldProfileId),
        supabase.from("tour_players").update({ player_id: mergeTarget.id }).eq("player_id", oldProfileId),
        supabase.from("handicap_history").update({ player_id: mergeTarget.id }).eq("player_id", oldProfileId),
        supabase.from("scorecards").update({ player_id: mergeTarget.id }).eq("player_id", oldProfileId),
        supabase.from("members").update({ user_id: mergeTarget.id }).eq("user_id", oldProfileId),
        supabase.from("round_players").update({ user_id: mergeTarget.id }).eq("user_id", oldProfileId),
      ];
      await Promise.all(updates);
      await supabase.from("profiles").delete().eq("id", oldProfileId);
      toast.success(`Profile "${oldName}" berhasil digabung ke "${mergeTarget.full_name}"`);
      setShowMergeDialog(false);
      setMergeTarget(null);
      setMergeSearch("");
      setMergeResults([]);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      toast.error(err.message || "Gagal merge");
    } finally {
      setMerging(false);
    }
  };

  if (isLoading) return (
    <div className="bottom-nav-safe">
      <AppHeader title="Platform Admin" rightContent={<button onClick={() => navigate("/settings")} className="text-xs text-muted-foreground hover:text-foreground px-2">← Back</button>} />
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bottom-nav-safe">
      <AppHeader title="Platform Admin Dashboard" rightContent={<button onClick={() => navigate("/settings")} className="text-xs text-muted-foreground hover:text-foreground px-2">← Back</button>} />
      <div className="space-y-4 p-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard icon={Users} label="Pengguna" value={stats?.totalUsers ?? 0} />
          <StatCard icon={Building2} label="Klub" value={stats?.totalClubs ?? 0} color="text-accent" />
          <StatCard icon={Trophy} label="Tur" value={stats?.totalTours ?? 0} />
          <StatCard icon={Calendar} label="Event" value={stats?.totalEvents ?? 0} color="text-accent" />
          <StatCard icon={MapPin} label="Venues" value={stats?.totalVenues ?? 0} />
          <StatCard icon={Flag} label="Active" value={(allTours ?? []).filter((t: any) => t.status === "active").length} color="text-accent" />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full overflow-x-auto flex">
            <TabsTrigger value="users" className="flex-1 text-xs relative">
              Users
              {pendingApprovals && pendingApprovals.length > 0 && (
                <span className="ml-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
                  {pendingApprovals.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="clubs" className="flex-1 text-xs">Clubs</TabsTrigger>
            <TabsTrigger value="tours" className="flex-1 text-xs">Tours</TabsTrigger>
            <TabsTrigger value="events" className="flex-1 text-xs">Event</TabsTrigger>
            <TabsTrigger value="venues" className="flex-1 text-xs">Courses</TabsTrigger>
            <TabsTrigger value="reports" className="flex-1 text-xs">Reports</TabsTrigger>
            <TabsTrigger value="features" className="flex-1 text-xs">Features</TabsTrigger>
            <TabsTrigger value="claims" className="flex-1 text-xs relative">
              Claims
              {pendingClaimsCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {pendingClaimsCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* TAB: USERS */}
          <TabsContent value="users" className="space-y-3 pt-2">
            {/* Pending Approvals */}
            {pendingApprovals && pendingApprovals.length > 0 && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-destructive flex items-center gap-1.5">
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white px-1">
                      {pendingApprovals.length}
                    </span>
                    Pending Approval
                  </p>
                  <button
                    onClick={() => navigate("/admin/approvals")}
                    className="text-xs text-primary font-semibold"
                  >
                    Lihat semua →
                  </button>
                </div>
                {pendingApprovals.slice(0, 3).map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between gap-2 rounded-lg bg-card px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{u.full_name ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <button
                      onClick={() => navigate("/admin/approvals")}
                      className="shrink-0 text-[10px] font-semibold text-primary border border-primary/30 rounded-full px-2 py-0.5"
                    >
                      Review
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama user..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {([
                { value: "name", label: "A–Z" },
                { value: "date_desc", label: "Terbaru" },
                { value: "date_asc", label: "Terlama" },
                { value: "hcp", label: "HCP" },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setUserSort(opt.value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    userSort === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {/* Alphabet filter */}
            {!userSearch && (
              <div className="flex flex-wrap gap-1 pt-1 pb-2">
                {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(letter => (
                  <button
                    key={letter}
                    onClick={() => setUserLetter(letter)}
                    className={`h-7 w-7 rounded-md text-xs font-bold transition-colors ${
                      userLetter === letter
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary"
                    }`}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            )}
            {allUsers && (
              <p className="text-xs text-muted-foreground pb-1">
                {allUsers.count} user{userSearch ? ` ditemukan` : ` berawalan "${userLetter}"`}
              </p>
            )}
            <div className="space-y-2">
              {allUsers?.data?.map(u => (
                <div key={u.id} className="golf-card flex items-center gap-3 p-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={u.avatar_url ?? ""} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                      {(u.full_name ?? "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{u.full_name || "No name"}</p>
                      {getAdminBadge(u.id)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {u.location || "—"} · HCP {u.handicap != null ? Number(u.handicap) : "—"} · {new Date(u.created_at).toLocaleDateString("id-ID")}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/profile/${u.id}`)}>
                        <Eye className="h-3.5 w-3.5 mr-2" /> View Profile
                      </DropdownMenuItem>
                      {!systemAdmins?.find(a => a.user_id === u.id) && (
                        <DropdownMenuItem onClick={() => handleGrantModerator(u.id)}>
                          <Shield className="h-3.5 w-3.5 mr-2" /> Grant Moderator
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => { setMergeTarget(u); setShowMergeDialog(true); }}>
                        <Users className="h-3.5 w-3.5 mr-2" /> Merge Profile
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>

          </TabsContent>

          {/* TAB: CLUBS */}
          <TabsContent value="clubs" className="space-y-2 pt-2">
            <Button size="sm" variant="outline" className="w-full gap-1 text-xs mb-2" onClick={() => navigate("/clubs")}>
              <Plus className="h-3.5 w-3.5" /> Add Club
            </Button>
            {allClubs?.map((c: any) => (
              <div key={c.id} className="golf-card flex items-center gap-3 p-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={c.logo_url ?? ""} />
                  <AvatarFallback className="bg-accent/20 text-accent text-xs font-bold">
                    {c.name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    {c.is_verified && <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {c.facility_type} · {c.members?.length ?? 0} members
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => navigate(`/clubs/${c.id}`)}>Edit</Button>
                  {!c.is_verified && (
                    <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => handleVerifyClub(c.id)}>
                      <CheckCircle className="h-3 w-3" /> Verify
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </TabsContent>

          {/* TAB: TOURS */}
          <TabsContent value="tours" className="space-y-2 pt-2">
            {(!allTours || allTours.length === 0) ? (
              <p className="text-center text-sm text-muted-foreground py-8">No tours found</p>
            ) : allTours.map((t: any) => (
              <button key={t.id} onClick={() => navigate(`/tour/${t.id}`)} className="golf-card w-full text-left flex items-center gap-3 p-3 hover:border-primary/30 transition-colors">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Trophy className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(t.clubs as any)?.name ?? "—"} · {(t.events as any[])?.length ?? 0} events
                    {t.year ? ` · ${t.year}` : ""}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                  t.status === "active" ? "bg-green-500/10 text-green-500 border-green-500/30" :
                  t.status === "done" ? "bg-muted text-muted-foreground border-border" :
                  t.status === "cancelled" ? "bg-destructive/10 text-destructive border-destructive/30" :
                  "bg-accent/10 text-accent border-accent/30"
                }`}>{t.status ?? "upcoming"}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </TabsContent>

          {/* TAB: EVENTS */}
          <TabsContent value="events" className="space-y-2 pt-2">
            <Select value={eventStatusFilter} onValueChange={setEventStatusFilter}>
              <SelectTrigger className="h-8 text-xs">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="ready">Registration</SelectItem>
                <SelectItem value="checkin">Check-in</SelectItem>
                <SelectItem value="playing">Playing</SelectItem>
                <SelectItem value="done">Completed</SelectItem>
              </SelectContent>
            </Select>
            {allEvents?.map((e: any) => (
              <button key={e.id} onClick={() => navigate(`/event/${e.id}`)} className="golf-card w-full text-left flex items-center gap-3 p-3 hover:border-primary/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{e.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.courses?.name} · {e.event_date} · {e.contestants?.length ?? 0} peserta
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">{e.status}</Badge>
              </button>
            ))}
          </TabsContent>

          {/* TAB: VENUES */}
          <TabsContent value="venues" className="space-y-2 pt-2">
            <Button size="sm" variant="outline" className="w-full gap-1 text-xs mb-2" onClick={() => navigate("/venue")}>
              <Plus className="h-3.5 w-3.5" /> Add Venue
            </Button>
            {allCourses?.map((c: any) => (
              <div key={c.id} className="golf-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.location} · Par {c.par} · {(c.clubs as any)?.name ?? "—"}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" className="h-7 text-[10px]"
                      onClick={() => navigate(`/venue/${c.id}`)}>View</Button>
                    <Button size="sm" className="h-7 text-[10px]"
                      onClick={() => navigate(`/admin/course/${c.id}`)}>Manage</Button>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* TAB: REPORTS */}
          <TabsContent value="reports" className="space-y-4 pt-2">
            <div className="golf-card p-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" /> Registrasi User per Bulan
              </h3>
              <div className="space-y-2">
                {usersByMonth?.map(m => {
                  const maxCount = Math.max(...(usersByMonth?.map(x => x.count) ?? [1]));
                  return (
                    <div key={m.month} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16 shrink-0">{m.month}</span>
                      <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                          style={{ width: `${Math.max((m.count / maxCount) * 100, 5)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold w-10 text-right">{m.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="golf-card p-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-accent" /> Ringkasan Platform
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Total Users</span><span className="font-bold">{stats?.totalUsers}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Clubs</span><span className="font-bold">{stats?.totalClubs}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Event</span><span className="font-bold">{stats?.totalEvents}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Venue</span><span className="font-bold">{stats?.totalVenues}</span></div>
              </div>
            </div>
          </TabsContent>

          {/* ── FEATURES TAB ── */}
          <TabsContent value="features" className="space-y-3 pt-2">
            <FeatureFlagsTab />
          </TabsContent>

          <TabsContent value="claims" className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Klaim profil dari user yang datanya sudah ada di EGT tapi belum terhubung ke akun mereka.
            </p>
            {(claimRequests?.length ?? 0) === 0 && (
              <div className="golf-card p-8 text-center text-sm text-muted-foreground">
                Belum ada klaim masuk
              </div>
            )}
            {claimRequests?.map((claim: any) => {
              const claimant = claim.claimant as any;
              const target = claim.target as any;
              const isPending = claim.status === "pending";
              const isProcessing = processingClaimId === claim.id;
              return (
                <div key={claim.id} className="golf-card p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={claimant?.avatar_url ?? ""} />
                      <AvatarFallback className="text-xs">{claimant?.full_name?.[0] ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{claimant?.full_name ?? "—"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        mengklaim profil <span className="font-medium text-foreground">"{target?.full_name ?? "—"}"</span>
                        {target?.location ? ` · ${target.location}` : ""}
                        {target?.handicap != null ? ` · HCP ${target.handicap}` : ""}
                      </p>
                      {claim.reason && (
                        <p className="text-[11px] text-muted-foreground mt-1 italic">"{claim.reason}"</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(claim.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      claim.status === "pending" ? "bg-amber-500/10 text-amber-500" :
                      claim.status === "approved" ? "bg-green-500/10 text-green-500" :
                      "bg-red-400/10 text-red-400"
                    }`}>
                      {claim.status === "pending" ? "Pending" :
                       claim.status === "approved" ? "Disetujui" : "Ditolak"}
                    </span>
                  </div>
                  {isPending && (
                    <div className="flex gap-2 pt-1 border-t border-border/50">
                      <Button size="sm" variant="outline"
                        className="flex-1 h-8 text-xs text-red-400 border-red-400/30 hover:bg-red-400/10"
                        disabled={isProcessing}
                        onClick={() => handleRejectClaim(claim.id, claim.claimant_id, "Identitas tidak dapat diverifikasi")}>
                        {isProcessing ? "..." : "Tolak"}
                      </Button>
                      <Button size="sm"
                        className="flex-1 h-8 text-xs"
                        disabled={isProcessing}
                        onClick={() => handleApproveClaim(claim)}>
                        {isProcessing ? "Memproses..." : "✓ Setujui & Gabung Data"}
                      </Button>
                    </div>
                  )}
                  {claim.admin_note && (
                    <p className="text-[10px] text-muted-foreground italic border-t border-border/50 pt-2">
                      Notes admin: {claim.admin_note}
                    </p>
                  )}
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>

      {/* Merge Profile Dialog */}
      {showMergeDialog && mergeTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md golf-card p-5 space-y-4">
            <div>
              <h3 className="font-bold text-base">Merge Profile</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Semua data tournament, scorecard, dan membership dari profile lama akan dipindahkan ke:
              </p>
              <div className="mt-2 rounded-lg bg-primary/10 px-3 py-2 flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {(mergeTarget.full_name ?? "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold">{mergeTarget.full_name}</p>
                  <p className="text-[10px] text-muted-foreground">{mergeTarget.location || "—"} · HCP {mergeTarget.handicap ?? "N/A"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Cari profile lama yang akan digabung:</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Nama player lama..."
                  value={mergeSearch}
                  onChange={e => handleMergeSearch(e.target.value)}
                  className="pl-8 h-9 text-sm"
                  autoFocus
                />
              </div>
              {mergeResults.length > 0 && (
                <div className="rounded-xl border border-border overflow-hidden max-h-48 overflow-y-auto">
                  {mergeResults.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => handleMerge(p.id, p.full_name)}
                      disabled={merging}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-secondary/50 border-b border-border/30 last:border-0 transition-colors"
                    >
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                        {(p.full_name ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.full_name}</p>
                        <p className="text-[10px] text-muted-foreground">HCP {p.handicap ?? "N/A"} · {new Date(p.created_at).toLocaleDateString("id-ID")}</p>
                      </div>
                      <span className="text-[10px] text-destructive font-semibold shrink-0">
                        {merging ? "Merging..." : "Gabung →"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => { setShowMergeDialog(false); setMergeTarget(null); setMergeSearch(""); setMergeResults([]); }}
              className="w-full text-sm text-muted-foreground hover:text-foreground py-2"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformAdminDashboard;
