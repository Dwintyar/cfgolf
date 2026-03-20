import { ArrowLeft, Search, Mail, Mic, Settings, UserPlus, Check, X, LogIn, Users, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import EditClubDialog from "@/components/EditClubDialog";
import InviteMemberDialog from "@/components/InviteMemberDialog";

type Tab = "members" | "requests";

const ClubProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [search, setSearch] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [tab, setTab] = useState<Tab>("members");
  const [joining, setJoining] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const { data: club, isLoading: clubLoading } = useQuery({
    queryKey: ["club", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Check ownership
  useEffect(() => {
    if (club && currentUserId) {
      setIsOwner(club.owner_id === currentUserId);
    }
  }, [club, currentUserId]);

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["club-members", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*, profiles(full_name, avatar_url, handicap, location)")
        .eq("club_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: staffRoles } = useQuery({
    queryKey: ["club-staff-public", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("club_staff")
        .select("user_id, staff_role")
        .eq("club_id", id!)
        .eq("status", "active");
      return Object.fromEntries(
        (data ?? []).map(s => [s.user_id, s.staff_role])
      );
    },
    enabled: !!id,
  });

  // Check if current user is already a member
  const isMember = members?.some((m) => m.user_id === currentUserId);

  // Check if current user has a pending join request
  const { data: myJoinRequest } = useQuery({
    queryKey: ["my-join-request", id, currentUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_invitations")
        .select("*")
        .eq("club_id", id!)
        .eq("invited_user_id", currentUserId!)
        .eq("invited_by", currentUserId!)
        .eq("status", "pending")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!currentUserId && !isOwner && !isMember,
  });

  // Pending invitations (for owner)
  const { data: pendingInvitations } = useQuery({
    queryKey: ["club-invitations", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_invitations")
        .select("*, profiles:invited_user_id(full_name, avatar_url)")
        .eq("club_id", id!)
        .eq("status", "pending");
      if (error) throw error;
      return data;
    },
    enabled: !!id && isOwner,
  });

  const initials = club?.name
    ?.split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase() ?? "??";

  const getInitials = (name: string | null) =>
    name
      ? name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
      : "??";

  const filteredMembers = members?.filter((m) => {
    const name = (m.profiles as any)?.full_name ?? "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "owner": return "Owner";
      case "admin": return "Admin";
      default: return "Member";
    }
  };

  const handleJoinRequest = async () => {
    if (!currentUserId || !id) return;
    setJoining(true);
    try {
      // Cek apakah sudah ada pending request
      const { data: existing } = await supabase
        .from("club_invitations")
        .select("id")
        .eq("club_id", id)
        .eq("invited_user_id", currentUserId)
        .eq("invited_by", currentUserId)
        .eq("status", "pending")
        .maybeSingle();

      if (existing) {
        toast({ title: "Permintaan bergabung sudah dikirim, mohon tunggu persetujuan admin." });
        setJoining(false);
        return;
      }

      // Cek apakah sudah member
      const { data: alreadyMember } = await supabase
        .from("members")
        .select("id")
        .eq("club_id", id)
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (alreadyMember) {
        toast({ title: "Anda sudah menjadi member klub ini." });
        setJoining(false);
        return;
      }

      // Baru insert request
      const { error } = await supabase.from("club_invitations").insert({
        club_id: id,
        invited_by: currentUserId,
        invited_user_id: currentUserId,
        status: "pending",
      });
      if (error) throw error;
      toast({ title: "Permintaan bergabung terkirim!" });
      queryClient.invalidateQueries({ queryKey: ["my-join-request", id, currentUserId] });
      queryClient.invalidateQueries({ queryKey: ["club-invitations", id] });
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setJoining(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: string, userId: string) => {
    setProcessingId(invitationId);
    try {
      const { error: memberError } = await supabase.from("members").insert({
        club_id: id!,
        user_id: userId,
        role: "member",
      });
      if (memberError && memberError.code !== "23505") {
        toast({ title: "Gagal", description: memberError.message, variant: "destructive" });
        return;
      }
      await supabase.from("club_invitations").update({ status: "accepted" }).eq("id", invitationId);
      toast({ title: "Member diterima!" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["club-members", id] }),
        queryClient.invalidateQueries({ queryKey: ["club-invitations", id] }),
      ]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    setProcessingId(invitationId);
    try {
      await supabase.from("club_invitations").update({ status: "declined" }).eq("id", invitationId);
      toast({ title: "Undangan ditolak" });
      await queryClient.invalidateQueries({ queryKey: ["club-invitations", id] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = pendingInvitations?.length ?? 0;
  const hasPendingRequest = !!myJoinRequest;

  return (
    <div className="bottom-nav-safe">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          {isOwner && (
            <>
              <button
                onClick={() => setShowInvite(true)}
                className="rounded-full p-2 hover:bg-muted transition-colors"
              >
                <UserPlus className="h-5 w-5 text-primary" />
              </button>
              <button
                onClick={() => setShowEdit(true)}
                className="rounded-full p-2 hover:bg-muted transition-colors"
              >
                <Settings className="h-5 w-5" />
              </button>
            </>
          )}
          <Avatar className="h-12 w-12 border-2 border-primary/30">
            <AvatarImage src={club?.logo_url ?? ""} />
            <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="px-4">
        {clubLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <div className="mb-4">
            <h1 className="font-display text-xl font-bold">{club?.name}</h1>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {club?.description || "Golf Club"}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{members?.length ?? 0} Members</Badge>
              {/* Join / Requested badge for non-owner non-members */}
              {!isOwner && !isMember && currentUserId && (
                hasPendingRequest ? (
                  <Badge variant="secondary" className="text-xs">
                    ⏳ Menunggu persetujuan
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    className="h-7 rounded-lg px-4 text-xs font-bold uppercase tracking-wider"
                    onClick={handleJoinRequest}
                    disabled={joining}
                  >
                    <LogIn className="h-3.5 w-3.5 mr-1" />
                    {joining ? "Mengirim..." : "Join"}
                  </Button>
                )
              )}
              {!isOwner && isMember && (
                <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                  ✓ Member
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Tabs for owner */}
        {isOwner && (
          <div className="flex gap-4 mb-4 border-b border-border/50">
            <button
              onClick={() => setTab("members")}
              className={`pb-2 text-sm font-semibold tracking-wider transition-colors relative ${tab === "members" ? "text-foreground" : "text-muted-foreground"}`}
            >
              MEMBERS
              {tab === "members" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
            </button>
            <button
              onClick={() => setTab("requests")}
              className={`pb-2 text-sm font-semibold tracking-wider transition-colors relative flex items-center gap-1.5 ${tab === "requests" ? "text-foreground" : "text-muted-foreground"}`}
            >
              REQUESTS
              {pendingCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {pendingCount}
                </span>
              )}
              {tab === "requests" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
            </button>
          </div>
        )}

        {/* Members tab */}
        {tab === "members" && (
          <>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Type a name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 rounded-xl border-border/50 bg-card/80 pl-10 pr-10"
              />
              <Mic className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>

            <div className="divide-y divide-border/30">
              {membersLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}

              {!membersLoading && (!filteredMembers || filteredMembers.length === 0) && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-semibold">Belum ada anggota</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {search ? "Tidak ditemukan" : "Undang golfer untuk bergabung ke klub ini"}
                  </p>
                </div>
              )}

              {filteredMembers?.map((m, i) => {
                const profile = m.profiles as any;
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 py-3 animate-fade-in cursor-pointer"
                    style={{ animationDelay: `${i * 40}ms` }}
                    onClick={() => navigate(`/profile/${m.user_id}`)}
                  >
                    <Avatar className="h-10 w-10 border-2 border-primary/30">
                      <AvatarImage src={profile?.avatar_url ?? ""} />
                      <AvatarFallback className="bg-secondary text-sm font-semibold">
                        {getInitials(profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{profile?.full_name || "Golfer"}</p>
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className={`text-xs ${m.role === "owner" ? "text-primary" : "text-muted-foreground"}`}>
                          {getRoleLabel(m.role)}
                        </span>
                        {staffRoles?.[m.user_id] && (
                          <span className="text-xs text-muted-foreground">
                            · {staffRoles[m.user_id]}
                          </span>
                        )}
                      </div>
                    </div>
                    <button className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                      <Mail className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Requests tab (owner only) */}
        {tab === "requests" && isOwner && (
          <div className="divide-y divide-border/30 animate-fade-in">
            {pendingCount === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">Tidak ada permintaan tertunda</p>
            )}
            {pendingInvitations?.map((inv: any) => {
              const profile = inv.profiles as any;
              return (
                <div key={inv.id} className="flex items-center gap-3 py-3">
                  <Avatar className="h-10 w-10 border-2 border-primary/30">
                    <AvatarImage src={profile?.avatar_url ?? ""} />
                    <AvatarFallback className="bg-secondary text-sm font-semibold">
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{profile?.full_name || "Golfer"}</p>
                    <p className="text-xs text-muted-foreground">Menunggu persetujuan</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleAcceptInvitation(inv.id, inv.invited_user_id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleRejectInvitation(inv.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {club && showEdit && (
        <EditClubDialog
          open={showEdit}
          onOpenChange={setShowEdit}
          club={{ id: club.id, name: club.name, description: club.description, logo_url: club.logo_url }}
          onUpdated={() => queryClient.invalidateQueries({ queryKey: ["club", id] })}
        />
      )}
      {id && (
        <InviteMemberDialog
          clubId={id}
          open={showInvite}
          onOpenChange={setShowInvite}
          onDone={() => queryClient.invalidateQueries({ queryKey: ["club-invitations", id] })}
        />
      )}
    </div>
  );
};

export default ClubProfile;
