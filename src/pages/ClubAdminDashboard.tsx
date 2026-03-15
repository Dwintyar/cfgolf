import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, UserCheck, Calendar, Bell, ChevronRight, Plus, ArrowLeft,
  Settings as SettingsIcon, Building2, Shield, Trash2, MessageSquare,
  Crown, AlertTriangle
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import InviteMemberDialog from "@/components/InviteMemberDialog";

const ClubAdminDashboard = () => {
  const { clubId: paramClubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("members");
  const [showInvite, setShowInvite] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState(paramClubId ?? "");

  // Settings form
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);

  // Succession
  const [successionUserId, setSuccessionUserId] = useState("");
  const [transferTargetId, setTransferTargetId] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Clubs user manages
  const { data: myAdminClubs } = useQuery({
    queryKey: ["club-admin-clubs", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("members")
        .select("club_id, role, clubs(id, name, logo_url)")
        .eq("user_id", userId!)
        .in("role", ["owner", "admin"]);
      return data ?? [];
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (paramClubId) setSelectedClubId(paramClubId);
    else if (myAdminClubs?.[0]) setSelectedClubId(myAdminClubs[0].club_id);
  }, [paramClubId, myAdminClubs]);

  const clubId = selectedClubId;

  // Club info
  const { data: club } = useQuery({
    queryKey: ["club-admin-info", clubId],
    queryFn: async () => {
      const { data } = await supabase.from("clubs").select("*").eq("id", clubId).single();
      return data;
    },
    enabled: !!clubId,
  });

  useEffect(() => {
    if (club) {
      setEditName(club.name ?? "");
      setEditDesc(club.description ?? "");
      setEditPhone(club.contact_phone ?? "");
      setEditEmail(club.contact_email ?? "");
      setSuccessionUserId(club.succession_user_id ?? "");
    }
  }, [club]);

  // Members
  const { data: members, refetch: refetchMembers } = useQuery({
    queryKey: ["club-admin-members", clubId],
    queryFn: async () => {
      const { data } = await supabase
        .from("members")
        .select("*, profiles(full_name, avatar_url, handicap)")
        .eq("club_id", clubId)
        .order("joined_at");
      return data ?? [];
    },
    enabled: !!clubId,
  });

  // Staff
  const { data: staff, refetch: refetchStaff } = useQuery({
    queryKey: ["club-admin-staff", clubId],
    queryFn: async () => {
      const { data } = await supabase
        .from("club_staff")
        .select("*, profiles(full_name, avatar_url)")
        .eq("club_id", clubId)
        .order("staff_role");
      return data ?? [];
    },
    enabled: !!clubId,
  });

  // Events via tours
  const { data: clubEvents } = useQuery({
    queryKey: ["club-admin-events", clubId],
    queryFn: async () => {
      const { data: tours } = await supabase.from("tours").select("id").eq("organizer_club_id", clubId);
      if (!tours || tours.length === 0) return [];
      const tourIds = tours.map(t => t.id);
      const { data } = await supabase
        .from("events")
        .select("*, courses(name), contestants(id)")
        .in("tour_id", tourIds)
        .order("event_date", { ascending: false });
      return data ?? [];
    },
    enabled: !!clubId,
  });

  // Pending invitations
  const { data: pendingInvitations } = useQuery({
    queryKey: ["club-admin-pending", clubId],
    queryFn: async () => {
      const { data } = await supabase
        .from("club_invitations")
        .select("*, profiles:invited_user_id(full_name)")
        .eq("club_id", clubId)
        .eq("status", "pending");
      return data ?? [];
    },
    enabled: !!clubId,
  });

  // KPIs
  const memberCount = members?.length ?? 0;
  const staffCount = staff?.length ?? 0;
  const upcomingEvents = clubEvents?.filter(e => e.status !== "completed").length ?? 0;
  const pendingCount = pendingInvitations?.length ?? 0;

  const isOwner = club?.owner_id === userId;
  const admins = members?.filter(m => m.role === "admin") ?? [];
  const regularMembers = members?.filter(m => m.role === "member") ?? [];

  const handleChangeRole = async (memberId: string, newRole: "admin" | "member") => {
    await supabase.from("members").update({ role: newRole }).eq("id", memberId);
    toast.success(`Role updated to ${newRole}`);
    refetchMembers();
  };

  const handleRemoveMember = async (memberId: string) => {
    await supabase.from("members").delete().eq("id", memberId);
    toast.success("Member removed");
    refetchMembers();
  };

  const handleSaveSettings = async () => {
    if (!clubId) return;
    setSaving(true);
    const { error } = await supabase.from("clubs").update({
      name: editName,
      description: editDesc,
      contact_phone: editPhone,
      contact_email: editEmail,
    }).eq("id", clubId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Club settings updated");
    queryClient.invalidateQueries({ queryKey: ["club-admin-info", clubId] });
  };

  const handleSaveSuccession = async () => {
    if (!clubId) return;
    const { error } = await supabase.from("clubs").update({
      succession_user_id: successionUserId || null,
    }).eq("id", clubId);
    if (error) { toast.error(error.message); return; }
    toast.success("Succession member updated");
    queryClient.invalidateQueries({ queryKey: ["club-admin-info", clubId] });
  };

  const handleTransferOwnership = async () => {
    if (!clubId || !transferTargetId || !userId) return;
    // Verify target is admin of this club
    const targetMember = members?.find(m => m.user_id === transferTargetId && m.role === "admin");
    if (!targetMember) {
      toast.error("Target must be an admin of this club");
      return;
    }
    const currentOwnerMember = members?.find(m => m.user_id === userId && m.role === "owner");
    if (!currentOwnerMember) return;

    // Update club owner
    const { error: e1 } = await supabase.from("clubs").update({ owner_id: transferTargetId }).eq("id", clubId);
    if (e1) { toast.error(e1.message); return; }
    // Promote target to owner - need to delete and re-insert since we can't update role
    await supabase.from("members").delete().eq("id", targetMember.id);
    await supabase.from("members").insert({ club_id: clubId, user_id: transferTargetId, role: "owner" });
    // Demote self to admin
    await supabase.from("members").delete().eq("id", currentOwnerMember.id);
    await supabase.from("members").insert({ club_id: clubId, user_id: userId, role: "admin" });

    toast.success("Ownership transferred successfully");
    queryClient.invalidateQueries({ queryKey: ["club-admin-info", clubId] });
    refetchMembers();
  };

  const handleArchiveClub = async () => {
    if (!clubId) return;
    const { error } = await supabase.from("clubs").update({ is_personal: true }).eq("id", clubId);
    if (error) { toast.error(error.message); return; }
    toast.success("Club archived");
    navigate("/clubs");
  };

  const roleColors: Record<string, string> = {
    owner: "bg-destructive/10 text-destructive border-destructive/30",
    admin: "bg-accent/10 text-accent border-accent/30",
    member: "bg-muted text-muted-foreground",
  };

  if (!clubId) return (
    <div className="bottom-nav-safe p-4 text-center text-muted-foreground">
      <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
      <p>No club selected</p>
    </div>
  );

  const getProfileName = (uid: string) => {
    const m = members?.find(m => m.user_id === uid);
    return m?.profiles?.full_name || "Unknown";
  };

  return (
    <div className="bottom-nav-safe">
      {/* Header */}
      <div className="flex items-center gap-2 p-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-lg font-bold flex-1 truncate">
          Admin — {club?.name ?? "Loading..."}
        </h1>
      </div>

      {/* Club selector */}
      {myAdminClubs && myAdminClubs.length > 1 && (
        <div className="px-4 pb-3">
          <Select value={selectedClubId} onValueChange={(v) => { setSelectedClubId(v); navigate(`/admin/club/${v}`, { replace: true }); }}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Select club" />
            </SelectTrigger>
            <SelectContent>
              {myAdminClubs.map((m: any) => (
                <SelectItem key={m.club_id} value={m.club_id}>
                  {(m.clubs as any)?.name ?? "Club"} ({m.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 px-4 pb-3">
        <div className="golf-card p-3 space-y-0.5">
          <Users className="h-4 w-4 text-primary" />
          <p className="text-xl font-bold">{memberCount}</p>
          <p className="text-[10px] text-muted-foreground">Members</p>
        </div>
        <div className="golf-card p-3 space-y-0.5">
          <UserCheck className="h-4 w-4 text-accent" />
          <p className="text-xl font-bold">{staffCount}</p>
          <p className="text-[10px] text-muted-foreground">Staff</p>
        </div>
        <div className="golf-card p-3 space-y-0.5">
          <Calendar className="h-4 w-4 text-primary" />
          <p className="text-xl font-bold">{upcomingEvents}</p>
          <p className="text-[10px] text-muted-foreground">Upcoming Events</p>
        </div>
        <div className="golf-card p-3 space-y-0.5">
          <Bell className="h-4 w-4 text-accent" />
          <p className="text-xl font-bold">{pendingCount}</p>
          <p className="text-[10px] text-muted-foreground">Pending Requests</p>
        </div>
      </div>

      {/* Pending Actions */}
      {pendingCount > 0 && (
        <div className="px-4 pb-3">
          <h2 className="font-display text-sm font-semibold mb-2 flex items-center gap-2">
            <Bell className="h-4 w-4 text-accent" /> Pending Actions
          </h2>
          <div className="golf-card p-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
              <Users className="h-4 w-4 text-accent" />
            </div>
            <p className="text-sm flex-1">{pendingCount} undangan menunggu respons</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="members" className="flex-1 text-xs">Members</TabsTrigger>
            <TabsTrigger value="staff" className="flex-1 text-xs">Staff</TabsTrigger>
            <TabsTrigger value="events" className="flex-1 text-xs">Events</TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 text-xs">Settings</TabsTrigger>
          </TabsList>

          {/* TAB: MEMBERS */}
          <TabsContent value="members" className="space-y-2 pt-2">
            <Button size="sm" variant="outline" className="w-full gap-1 text-xs mb-2" onClick={() => setShowInvite(true)}>
              <Plus className="h-3.5 w-3.5" /> Invite Member
            </Button>
            {members?.map((m: any) => (
              <div key={m.id} className="golf-card flex items-center gap-3 p-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={m.profiles?.avatar_url ?? ""} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                    {(m.profiles?.full_name ?? "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{m.profiles?.full_name || "Unknown"}</p>
                  <Badge variant="outline" className={`text-[9px] ${roleColors[m.role] ?? ""}`}>{m.role}</Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {m.role === "member" && (
                      <DropdownMenuItem onClick={() => handleChangeRole(m.id, "admin")}>
                        <Shield className="h-3.5 w-3.5 mr-2" /> Promote to Admin
                      </DropdownMenuItem>
                    )}
                    {m.role === "admin" && (
                      <DropdownMenuItem onClick={() => handleChangeRole(m.id, "member")}>
                        <Users className="h-3.5 w-3.5 mr-2" /> Demote to Member
                      </DropdownMenuItem>
                    )}
                    {m.role !== "owner" && (
                      <DropdownMenuItem onClick={() => handleRemoveMember(m.id)} className="text-destructive">
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Remove
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => navigate(`/profile/${m.user_id}`)}>
                      <MessageSquare className="h-3.5 w-3.5 mr-2" /> View Profile
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </TabsContent>

          {/* TAB: STAFF */}
          <TabsContent value="staff" className="space-y-2 pt-2">
            {staff?.length === 0 && (
              <div className="golf-card p-6 text-center text-sm text-muted-foreground">No staff assigned</div>
            )}
            {staff?.map((s: any) => (
              <div key={s.id} className="golf-card flex items-center gap-3 p-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={s.profiles?.avatar_url ?? ""} />
                  <AvatarFallback className="bg-accent/20 text-accent text-xs font-bold">
                    {(s.profiles?.full_name ?? "S").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{s.profiles?.full_name || "Staff"}</p>
                  <p className="text-xs text-muted-foreground capitalize">{s.staff_role} · {s.status}</p>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* TAB: EVENTS */}
          <TabsContent value="events" className="space-y-2 pt-2">
            <Button size="sm" variant="outline" className="w-full gap-1 text-xs mb-2" onClick={() => navigate("/tour")}>
              <Plus className="h-3.5 w-3.5" /> Create Event
            </Button>
            {clubEvents?.length === 0 && (
              <div className="golf-card p-6 text-center text-sm text-muted-foreground">No events yet</div>
            )}
            {clubEvents?.map((e: any) => (
              <button key={e.id} onClick={() => navigate(`/event/${e.id}`)} className="golf-card w-full text-left flex items-center gap-3 p-3 hover:border-primary/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{e.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.event_date} · {e.courses?.name} · {e.contestants?.length ?? 0} peserta
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">{e.status}</Badge>
              </button>
            ))}
          </TabsContent>

          {/* TAB: SETTINGS */}
          <TabsContent value="settings" className="space-y-4 pt-2 pb-6">
            {/* SECTION 1: Club Identity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> Club Identity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Club Name</Label>
                  <Input value={editName} onChange={e => setEditName(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} className="mt-1" rows={3} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Contact Phone</Label>
                  <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Contact Email</Label>
                  <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="mt-1" />
                </div>
                <Button className="w-full" onClick={handleSaveSettings} disabled={saving}>
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
              </CardContent>
            </Card>

            {/* SECTION 2: Admin Management (owner only) */}
            {isOwner && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" /> Admin Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {admins.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No admins assigned yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {admins.map((a: any) => (
                        <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={a.profiles?.avatar_url ?? ""} />
                            <AvatarFallback className="bg-accent/20 text-accent text-xs font-bold">
                              {(a.profiles?.full_name ?? "A").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{a.profiles?.full_name || "Admin"}</p>
                            <Badge variant="outline" className="text-[9px] bg-accent/10 text-accent border-accent/30">admin</Badge>
                          </div>
                          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => handleChangeRole(a.id, "member")}>
                            Demote
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {regularMembers.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Promote Member to Admin</Label>
                      <Select onValueChange={(memberId) => handleChangeRole(memberId, "admin")}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="+ Select member to promote" />
                        </SelectTrigger>
                        <SelectContent>
                          {regularMembers.map((m: any) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.profiles?.full_name || "Member"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* SECTION 3: Succession & Transfer (owner only) */}
            {isOwner && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Crown className="h-4 w-4 text-primary" /> Succession & Transfer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Succession Member */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Succession Member</Label>
                    <p className="text-[11px] text-muted-foreground mb-2">
                      If you're inactive for 180 days, this person will automatically become owner.
                    </p>
                    <Select value={successionUserId} onValueChange={setSuccessionUserId}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select an admin" />
                      </SelectTrigger>
                      <SelectContent>
                        {admins.map((a: any) => (
                          <SelectItem key={a.user_id} value={a.user_id}>
                            {a.profiles?.full_name || "Admin"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="w-full mt-2 text-xs" onClick={handleSaveSuccession}>
                      Save Succession
                    </Button>
                  </div>

                  {/* Transfer Ownership */}
                  <div className="border-t border-border pt-4">
                    <Label className="text-xs text-muted-foreground mb-1 block">Transfer Ownership</Label>
                    <p className="text-[11px] text-muted-foreground mb-2">
                      Transfer full ownership to an admin. You will become an Admin. This cannot be undone.
                    </p>
                    <Select value={transferTargetId} onValueChange={setTransferTargetId}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select admin to transfer to" />
                      </SelectTrigger>
                      <SelectContent>
                        {admins.map((a: any) => (
                          <SelectItem key={a.user_id} value={a.user_id}>
                            {a.profiles?.full_name || "Admin"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="w-full mt-2 text-xs" disabled={!transferTargetId}>
                          Transfer Ownership
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Transfer Ownership</AlertDialogTitle>
                          <AlertDialogDescription>
                            Anda akan menyerahkan kepemilikan klub kepada <strong>{getProfileName(transferTargetId)}</strong>.
                            Anda akan menjadi Admin biasa. Tindakan ini tidak dapat dibatalkan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batalkan</AlertDialogCancel>
                          <AlertDialogAction onClick={handleTransferOwnership}>Ya, Transfer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* SECTION 4: Danger Zone (owner only) */}
            {isOwner && (
              <Card className="border-destructive/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" /> Danger Zone
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[11px] text-muted-foreground mb-3">
                    Club akan diarsipkan. Member tidak bisa bergabung baru. Data tetap tersimpan.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
                        Archive Club
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Archive Club</AlertDialogTitle>
                        <AlertDialogDescription>
                          Club akan diarsipkan dan tidak bisa menerima member baru. Data tetap tersimpan. Lanjutkan?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batalkan</AlertDialogCancel>
                        <AlertDialogAction onClick={handleArchiveClub} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Ya, Archive
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Invite Dialog */}
      {clubId && (
        <InviteMemberDialog
          clubId={clubId}
          open={showInvite}
          onOpenChange={setShowInvite}
          onDone={() => { setShowInvite(false); refetchMembers(); }}
        />
      )}
    </div>
  );
};

export default ClubAdminDashboard;
