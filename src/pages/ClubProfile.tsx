import { ArrowLeft, Search, Mail, Mic, Settings, UserPlus, Check, X, LogIn, Users, Loader2, AlertTriangle, Shield } from "lucide-react";
import CommitteeRoleBadges from "@/components/CommitteeRoleBadges";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ClubTournamentsTab from "@/components/tour/ClubTournamentsTab";
import VenueStaffTab from "@/components/club/VenueStaffTab";
import VenueRoundsTab from "@/components/tour/VenueRoundsTab";
import VenueScheduleTab from "@/components/club/VenueScheduleTab";
import InviteMemberDialog from "@/components/InviteMemberDialog";
import VenueJoinDialog from "@/components/club/VenueJoinDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Tab = "members" | "tournaments";

interface ClubProfileProps {
  embedded?: boolean;
  clubId?: string;
  onBack?: () => void;
  onNavigateToClub?: (clubId: string) => void;
}

const ClubProfile = ({ embedded = false, clubId: propClubId, onBack, onNavigateToClub }: ClubProfileProps) => {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const id = propClubId ?? params.id;
  const isEmbeddedUrl = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("embedded");
  const [search, setSearch] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showClubSettings, setShowClubSettings] = useState(false);
  const [tab, setTab] = useState<Tab>("members");
  const [joining, setJoining] = useState(false);
  const [showVenueJoin, setShowVenueJoin] = useState(false);
  const [selectedTransferMember, setSelectedTransferMember] = useState<string | null>(null);
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const [transferring, setTransferring] = useState(false);
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

  const isVenue = (club as any)?.club_type === "venue";

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

  const { data: committeeRoleMap } = useQuery({
    queryKey: ["club-committee-roles", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("club_committee_roles")
        .select("user_id, role")
        .eq("club_id", id!);
      const map: Record<string, string[]> = {};
      data?.forEach((cr) => {
        if (!map[cr.user_id!]) map[cr.user_id!] = [];
        map[cr.user_id!].push(cr.role);
      });
      return map;
    },
    enabled: !!id,
  });

  // Check if current user is already a member
  const isMember = members?.some((m) => m.user_id === currentUserId);

  // Check if current user already has a (pending/active) staff entry for this venue
  const { data: myStaffEntry, refetch: refetchMyStaff } = useQuery({
    queryKey: ["my-staff-entry", id, currentUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from("club_staff")
        .select("id, staff_role, status")
        .eq("club_id", id!)
        .eq("user_id", currentUserId!)
        .maybeSingle();
      return data;
    },
    enabled: !!id && !!currentUserId,
  });

  // Pending staff requests (for venue club tab badge)
  const { data: pendingStaff } = useQuery({
    queryKey: ["club-profile-pending-staff", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("club_staff")
        .select("id")
        .eq("club_id", id!)
        .eq("status", "pending");
      return data ?? [];
    },
    enabled: !!id && isVenue,
  });

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


  // Get channel for this club (venue)
  const { data: clubChannel } = useQuery({
    queryKey: ["club-channel", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("channels").select("id, name").eq("club_id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  // Venue courses (lightweight — for action button)
  const { data: venueCourses } = useQuery({
    queryKey: ["venue-courses-action", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses").select("id, name").eq("club_id", id!).order("name");
      return data ?? [];
    },
    enabled: !!id && isVenue,
  });


  const getInitials = (name: string | null) =>
    name
      ? name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
      : "??";

  const filteredMembers = members?.filter((m) => {
    const name = (m.profiles as any)?.full_name ?? "";
    return name.toLowerCase().includes(search.toLowerCase());
  })?.sort((a, b) => {
    const roleOrder: Record<string, number> = { owner: 0, admin: 1, member: 2 };
    const ra = roleOrder[a.role] ?? 2;
    const rb = roleOrder[b.role] ?? 2;
    if (ra !== rb) return ra - rb;
    const na = (a.profiles as any)?.full_name ?? "";
    const nb = (b.profiles as any)?.full_name ?? "";
    return na.localeCompare(nb, "id");
  });

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "owner": return "Owner";
      case "admin": return "Admin";
      default: return "Member";
    }
  };

  const handleJoinRequest = async () => {
    if (!currentUserId || !id || joining) return;
    setJoining(true);
    try {
      const { error } = await supabase.from("club_invitations").insert({
        club_id: id,
        invited_by: currentUserId,
        invited_user_id: currentUserId,
        status: "pending",
      });
      if (error) {
        // Duplicate key = already has pending request, treat as success
        if (error.code === "23505") {
          queryClient.invalidateQueries({ queryKey: ["my-join-request", id, currentUserId] });
          return;
        }
        throw error;
      }
      toast({ title: "Permintaan bergabung terkirim!" });
      queryClient.invalidateQueries({ queryKey: ["my-join-request", id, currentUserId] });
      queryClient.invalidateQueries({ queryKey: ["club-invitations", id] });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
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
        toast({ title: "Failed", description: memberError.message, variant: "destructive" });
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
      {/* WA-style: back button top left */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        {embedded ? (
          onBack ? (
            <button onClick={onBack} className="rounded-full p-1.5 hover:bg-muted transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : <div />
        ) : (
          <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        {isOwner && (
          <div className="flex gap-1">
            <button onClick={() => setShowInvite(true)} className="rounded-full p-2 hover:bg-muted transition-colors">
              <UserPlus className="h-5 w-5 text-primary" />
            </button>
            <button onClick={() => setShowClubSettings(true)} className="rounded-full p-2 hover:bg-muted transition-colors">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* WA-style hero: centered logo + name */}
      <div className="flex flex-col items-center px-4 pb-4 text-center">
        <Avatar className="h-24 w-24 border-4 border-primary/20 mb-3">
          <AvatarImage src={club?.logo_url ?? ""} />
          <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">{initials}</AvatarFallback>
        </Avatar>
        {clubLoading ? (
          <div className="space-y-2 w-full max-w-xs">
            <Skeleton className="h-7 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold">{club?.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Golf Club · <span className="text-primary font-semibold">{members?.length ?? 0} members</span>
            </p>
            {club?.description && (
              <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">{club.description}</p>
            )}
          </>
        )}

        {/* Action buttons — WA style */}
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {clubChannel && (
            <button
              onClick={() => navigate(`/lounge?channel=${clubChannel.id}`)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors">
              📢 Channel
            </button>
          )}
          {isVenue && venueCourses && venueCourses.length > 0 && (
            venueCourses.length === 1 ? (
              <button
                onClick={() => navigate(`/venue/${venueCourses[0].id}`)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors">
                ⛳ {venueCourses[0].name}
              </button>
            ) : (
              <div className="relative group">
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors">
                  ⛳ {venueCourses.length} Courses
                </button>
                <div className="absolute top-full left-0 mt-1 hidden group-hover:block bg-card border border-border rounded-xl shadow-lg overflow-hidden z-10 min-w-[160px]">
                  {venueCourses.map((c: any) => (
                    <button key={c.id} onClick={() => navigate(`/venue/${c.id}`)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-secondary transition-colors border-b border-border/50 last:border-0">
                      ⛳ {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )
          )}
          {!isOwner && !isMember && currentUserId && (
            isVenue ? (
              myStaffEntry ? (
                myStaffEntry.status === "pending" ? (
                  <Button variant="outline" size="sm" disabled>
                    ⏳ Pending ({myStaffEntry.staff_role})
                  </Button>
                ) : (
                  <Badge className="text-sm bg-primary/10 text-primary border-primary/20 px-3 py-1">
                    ✓ {myStaffEntry.staff_role}
                  </Badge>
                )
              ) : (
                <Button size="sm" onClick={() => setShowVenueJoin(true)}>
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Join as Staff
                </Button>
              )
            ) : (
            hasPendingRequest || joining ? (
              <Button variant="outline" size="sm" disabled>
                {joining ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Requesting...</> : "⏳ Pending"}
              </Button>
            ) : (
              <Button size="sm" onClick={handleJoinRequest} disabled={joining}>
                <LogIn className="h-3.5 w-3.5 mr-1.5" /> Join Club
              </Button>
            )
            )
          )}
          {!isOwner && isMember && (
            <Badge className="text-sm bg-primary/10 text-primary border-primary/20 px-3 py-1">✓ Member</Badge>
          )}
          {isOwner && (
            <Badge className="text-sm bg-yellow-500/10 text-yellow-500 border-yellow-500/20 px-3 py-1">👑 Owner</Badge>
          )}
          {(isOwner || (isMember && (members?.find((m: any) => m.user_id === currentUserId)?.role === "admin"))) && id && (
            <button
              onClick={() => navigate(`/admin/club/${id}`)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-secondary border border-border text-sm font-semibold hover:bg-secondary/80 transition-colors">
              ⚙️ Admin
            </button>
          )}
        </div>
      </div>

      <div className="px-4">
        {/* Tabs — WA underline style */}
        <div className="flex border-b border-border/50 mb-4">
          {[
            {
              id: "members",
              label: isVenue
                ? `Staff${(pendingStaff?.length ?? 0) > 0 ? " 🔴" : ""}`
                : `Members${pendingCount > 0 ? " 🔴" : ""}`,
            },
            {
              id: "tournaments",
              label: isVenue ? "Schedule" : "Tournaments",
            },

          ].map(t => (
            <button key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
                tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Members tab */}
        {tab === "members" && (
          <>
            {/* Pending join requests — inline for owner */}
            {isOwner && pendingCount > 0 && (
              <div className="mb-3">
                {pendingInvitations?.map((inv: any) => {
                  const profile = inv.profiles as any;
                  return (
                    <div key={inv.id} className="flex items-center gap-3 py-3 px-0 border-b border-border/30 bg-amber-500/5">
                      <Avatar className="h-12 w-12 rounded-2xl shrink-0">
                        <AvatarImage src={profile?.avatar_url ?? ""} />
                        <AvatarFallback className="rounded-2xl bg-amber-500/10 text-sm font-semibold text-amber-500">
                          {getInitials(profile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-base font-semibold truncate">{profile?.full_name || "Golfer"}</p>
                          <span className="text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30 px-1.5 py-0.5 rounded-full shrink-0">Pending</span>
                        </div>
                        <p className="text-[13px] text-muted-foreground">Requesting to join</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => handleAcceptInvitation(inv.id, inv.invited_user_id)}
                          disabled={processingId === inv.id}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {processingId === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleRejectInvitation(inv.id)}
                          disabled={processingId === inv.id}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {isVenue && id ? (
              <div className="-mx-4">
                <VenueStaffTab clubId={id} />
              </div>
            ) : (<>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Type a name..."
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
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-primary/60" />
                  </div>
                  <p className="text-lg font-semibold text-foreground">No members yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {search ? "No matching members found." : "Share your club link to invite golfers to join."}
                  </p>
                  {!search && isOwner && (
                    <Button className="mt-4" onClick={() => setShowInvite(true)}>
                      Copy Invite Link
                    </Button>
                  )}
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
                      <CommitteeRoleBadges roles={committeeRoleMap?.[m.user_id] ?? []} />
                    </div>
                    <button className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                      <Mail className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
            </>)}
          </>
        )}

        {/* Tournaments/Rounds tab */}
        {tab === "tournaments" && (
          <div className="-mx-4">
            {isVenue
              ? <VenueScheduleTab clubId={id!} />
              : <ClubTournamentsTab clubId={id!} />
            }
          </div>
        )}

        {/* Venues tab */}

      </div>

      {/* Club Settings Sheet */}
      <Sheet open={showClubSettings} onOpenChange={setShowClubSettings}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left">Club Settings</SheetTitle>
          </SheetHeader>
          <div className="space-y-1">
            {/* Edit Club */}
            <button onClick={() => { setShowClubSettings(false); setShowEdit(true); }}
              className="flex w-full items-center gap-4 px-2 py-3.5 rounded-xl hover:bg-secondary transition-colors">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">Edit Club</p>
                <p className="text-xs text-muted-foreground">Update nama, logo, dan deskripsi club</p>
              </div>
            </button>

            {/* Invite Member */}
            <button onClick={() => { setShowClubSettings(false); setShowInvite(true); }}
              className="flex w-full items-center gap-4 px-2 py-3.5 rounded-xl hover:bg-secondary transition-colors">
              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                <UserPlus className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">Invite Member</p>
                <p className="text-xs text-muted-foreground">Undang anggota baru ke club</p>
              </div>
            </button>

            <div className="border-t border-border/50 my-2" />

            {/* Transfer Ownership — inline form */}
            <div className="rounded-xl border border-destructive/30 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-destructive">Transfer Ownership</p>
                  <p className="text-xs text-muted-foreground">Pindahkan kepemilikan club ke anggota lain</p>
                </div>
              </div>
              <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-3">
                <p className="text-xs text-amber-600">⚠ Tindakan ini tidak dapat dibatalkan tanpa persetujuan pemilik baru.</p>
              </div>
              <Select value={selectedTransferMember ?? ""} onValueChange={(val) => setSelectedTransferMember(val || null)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih anggota..." />
                </SelectTrigger>
                <SelectContent>
                  {members?.filter((m) => m.user_id !== currentUserId)
                    .sort((a, b) => ((a.profiles as any)?.full_name ?? "").localeCompare((b.profiles as any)?.full_name ?? "", "id"))
                    .map((m) => {
                      const profile = m.profiles as any;
                      return (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          {profile?.full_name || "Golfer"} ({getRoleLabel(m.role)})
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
              <Button variant="destructive" className="w-full"
                disabled={!selectedTransferMember || transferring}
                onClick={() => { setShowClubSettings(false); setShowTransferConfirm(true); }}>
                {transferring ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Transferring...</> : "Transfer Ownership"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Transfer Confirmation Dialog */}
      <AlertDialog open={showTransferConfirm} onOpenChange={setShowTransferConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer Kepemilikan</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin mentransfer kepemilikan <strong>{club?.name}</strong> kepada{" "}
              <strong>
                {(() => {
                  const m = members?.find((m) => m.user_id === selectedTransferMember);
                  return (m?.profiles as any)?.full_name || "Golfer";
                })()}
              </strong>
              ?
              <br /><br />
              Anda akan menjadi admin setelah transfer ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={transferring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={transferring}
              onClick={async (e) => {
                e.preventDefault();
                if (!selectedTransferMember || !currentUserId || !id) return;
                setTransferring(true);
                try {
                  // Step 1: Update club owner
                  const { error: e1 } = await supabase
                    .from("clubs")
                    .update({ owner_id: selectedTransferMember })
                    .eq("id", id);
                  if (e1) throw e1;

                  // Step 2: Update member roles
                  const { error: e2 } = await supabase
                    .from("members")
                    .update({ role: "owner" as any })
                    .eq("club_id", id)
                    .eq("user_id", selectedTransferMember);
                  if (e2) throw e2;

                  const { error: e3 } = await supabase
                    .from("members")
                    .update({ role: "admin" as any })
                    .eq("club_id", id)
                    .eq("user_id", currentUserId);
                  if (e3) throw e3;

                  const selectedName = (() => {
                    const m = members?.find((m) => m.user_id === selectedTransferMember);
                    return (m?.profiles as any)?.full_name || "Golfer";
                  })();

                  toast({
                    title: "Kepemilikan club berhasil ditransfer",
                    description: `Kepemilikan telah dipindahkan kepada ${selectedName}`,
                  });

                  navigate(`/clubs/${id}`);
                } catch (err: any) {
                  toast({ title: "Failed", description: err.message, variant: "destructive" });
                } finally {
                  setTransferring(false);
                  setShowTransferConfirm(false);
                }
              }}
            >
              {transferring ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Ya, Transfer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Venue Join Dialog */}
      {club && currentUserId && isVenue && (
        <VenueJoinDialog
          open={showVenueJoin}
          onOpenChange={setShowVenueJoin}
          clubId={club.id}
          clubName={club.name}
          userId={currentUserId}
          onSuccess={() => refetchMyStaff()}
        />
      )}
    </div>
  );
};

export default ClubProfile;
