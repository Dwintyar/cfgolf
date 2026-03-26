import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell, UserPlus, Calendar, TrendingDown, Trophy, Building2, Check, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";

interface NotificationItem {
  id: string;
  type: "buddy_request" | "club_invite" | "upcoming_event" | "handicap_update" | "event_result" | "tournament_invite" | "join_request" | "tournament_update";
  title: string;
  subtitle: string;
  time: string;
  avatar?: string;
  actionable?: boolean;
  meta?: any;
}

const Notifications = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) navigate("/login", { replace: true });
      else setUserId(user.id);
    });
  }, [navigate]);

  const formatTime = (date: string) => {
    const diff = (Date.now() - new Date(date).getTime()) / 1000;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      const items: NotificationItem[] = [];

      // 1. Pending buddy requests
      const { data: buddyReqs } = await supabase
        .from("buddy_connections")
        .select("*, profiles:requester_id(full_name, avatar_url)")
        .eq("addressee_id", userId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      buddyReqs?.forEach((r: any) => {
        items.push({
          id: `buddy-${r.id}`,
          type: "buddy_request",
          title: `${r.profiles?.full_name ?? "Someone"} sent a buddy request`,
          subtitle: "Wants to connect with you",
          time: formatTime(r.created_at),
          avatar: r.profiles?.avatar_url,
          actionable: true,
          meta: { connectionId: r.id },
        });
      });

      // 2. Pending club invitations
      const { data: clubInvites } = await supabase
        .from("club_invitations")
        .select("*, clubs(name, logo_url)")
        .eq("invited_user_id", userId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      clubInvites?.forEach((inv: any) => {
        items.push({
          id: `club-${inv.id}`,
          type: "club_invite",
          title: `${(inv.clubs as any)?.name ?? "A club"} invited you`,
          subtitle: "Join the club",
          time: formatTime(inv.created_at),
          avatar: (inv.clubs as any)?.logo_url,
          actionable: true,
          meta: { inviteId: inv.id, clubId: inv.club_id },
        });
      });

      // 3. Tournament interclub invitations (for club owner/admin)
      const { data: myAdminClubs } = await supabase
        .from("members")
        .select("club_id, clubs(name, logo_url)")
        .eq("user_id", userId!)
        .in("role", ["owner", "admin"]);

      if (myAdminClubs && myAdminClubs.length > 0) {
        const myClubIds = myAdminClubs.map(m => m.club_id);

        const { data: tourInvites } = await supabase
          .from("tour_clubs")
          .select("*, tours(id, name, tournament_type, clubs!tours_organizer_club_id_fkey(name))")
          .in("club_id", myClubIds)
          .eq("status", "invited")
          .order("created_at", { ascending: false });

        tourInvites?.forEach((inv: any) => {
          const tour = inv.tours;
          const organizerName = tour?.clubs?.name ?? "A club";
          const invitedClub = myAdminClubs.find(m => m.club_id === inv.club_id);
          const invitedClubName = (invitedClub?.clubs as any)?.name ?? "Your club";

          items.push({
            id: `tour-invite-${inv.id}`,
            type: "tournament_invite",
            title: `${invitedClubName} diundang ke ${tour?.name ?? "tournament"}`,
            subtitle: `Oleh ${organizerName} · ${tour?.tournament_type ?? "interclub"} · Quota: ${inv.ticket_quota} tiket`,
            time: formatTime(inv.created_at),
            actionable: true,
            meta: {
              tourClubId: inv.id,
              tourId: tour?.id,
              clubId: inv.club_id,
            },
          });
        });

        // Join requests ke klub yang user adalah owner/admin
        const { data: myManagedClubs } = await supabase
          .from("members")
          .select("club_id, clubs(name)")
          .eq("user_id", userId!)
          .in("role", ["owner", "admin"]);

        if (myManagedClubs && myManagedClubs.length > 0) {
          const myClubIds = myManagedClubs.map((m: any) => m.club_id);

          // Ambil SEMUA pending invitations untuk klub ini
          const { data: pendingAll, error: pendingErr } = await supabase
            .from("club_invitations")
            .select("id, club_id, invited_by, invited_user_id, created_at, clubs(name), profiles:invited_user_id(full_name, avatar_url)")
            .in("club_id", myClubIds)
            .eq("status", "pending");

          if (pendingErr) console.error("pending error:", pendingErr);

          // Filter join requests: invited_by === invited_user_id
          const joinReqs = (pendingAll ?? []).filter(
            (r: any) => r.invited_by === r.invited_user_id
          );


          joinReqs.forEach((r: any) => {
            const profile = r.profiles as any;
            const clubName = (r.clubs as any)?.name ?? "klub Anda";

            items.push({
              id: `join-${r.id}`,
              type: "join_request" as any,
              title: `${profile?.full_name ?? "Someone"} ingin bergabung`,
              subtitle: `Request join ke ${clubName}`,
              time: formatTime(r.created_at),
              avatar: profile?.avatar_url ?? null,
              actionable: true,
              meta: {
                inviteId: r.id,
                clubId: r.club_id,
                userId: r.invited_user_id,
              },
            });
          });
        }
      }

      // 4. Upcoming events (within 7 days)
      const { data: myContestants } = await supabase
        .from("contestants")
        .select("event_id, events(id, name, event_date, status)")
        .eq("player_id", userId!);

      myContestants?.forEach((c: any) => {
        const ev = c.events;
        if (!ev) return;
        const eventDate = new Date(ev.event_date);
        const now = new Date();
        const diffDays = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > 0 && diffDays <= 7 && ev.status !== "completed") {
          items.push({
            id: `event-${ev.id}`,
            type: "upcoming_event",
            title: `${ev.name} is coming up`,
            subtitle: `${ev.event_date}${diffDays <= 1 ? " — Tomorrow!" : ""}`,
            time: `${Math.ceil(diffDays)}d`,
            meta: { eventId: ev.id },
          });
        }
      });

      // 5. Recent handicap updates
      const { data: hcpUpdates } = await supabase
        .from("handicap_history")
        .select("*, events(name)")
        .eq("player_id", userId!)
        .order("created_at", { ascending: false })
        .limit(3);

      hcpUpdates?.forEach((h: any) => {
        items.push({
          id: `hcp-${h.id}`,
          type: "handicap_update",
          title: `Handicap updated: ${h.old_hcp ?? "?"} → ${h.new_hcp ?? "?"}`,
          subtitle: (h.events as any)?.name ?? "Tournament result",
          time: formatTime(h.created_at),
        });
      });

      // 6. Recent event results
      const { data: recentResults } = await supabase
        .from("event_results")
        .select("*, events(name), contestants(player_id), tournament_winner_categories(category_name)")
        .order("created_at", { ascending: false })
        .limit(5);

      recentResults?.forEach((r: any) => {
        if ((r.contestants as any)?.player_id === userId) {
          items.push({
            id: `result-${r.id}`,
            type: "event_result",
            title: `You placed #${r.rank_position} in ${(r.events as any)?.name}`,
            subtitle: (r.tournament_winner_categories as any)?.category_name ?? "Category",
            time: formatTime(r.created_at),
            meta: { eventId: r.event_id },
          });
        }
      });

      // 7. Tournament update notifications from notifications table
      const { data: tourNotifs } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId!)
        .eq("type", "tournament_update")
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(20);

      tourNotifs?.forEach((n: any) => {
        items.push({
          id: `notif-${n.id}`,
          type: "tournament_update",
          title: n.title,
          subtitle: n.message,
          time: formatTime(n.created_at),
          meta: { ...(n.metadata ?? {}), notifId: n.id },
        });
      });

      return items;
    },
    enabled: !!userId,
  });

  const handleAcceptBuddy = async (connectionId: string) => {
    setActionLoading(connectionId);
    await supabase.from("buddy_connections").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", connectionId);
    toast.success("Buddy accepted!");
    refetch();
    setActionLoading(null);
  };

  const handleDeclineBuddy = async (connectionId: string) => {
    setActionLoading(connectionId);
    await supabase.from("buddy_connections").update({ status: "declined", updated_at: new Date().toISOString() }).eq("id", connectionId);
    toast.success("Request declined");
    refetch();
    setActionLoading(null);
  };

  const handleAcceptClub = async (inviteId: string, clubId: string) => {
    if (!userId) return;
    setActionLoading(inviteId);
    await supabase.from("club_invitations").update({ status: "accepted" }).eq("id", inviteId);
    await supabase.from("members").insert({ club_id: clubId, user_id: userId, role: "member" });
    toast.success("Joined club!");
    refetch();
    setActionLoading(null);
  };

  const handleDeclineClub = async (inviteId: string) => {
    setActionLoading(inviteId);
    await supabase.from("club_invitations").update({ status: "declined" }).eq("id", inviteId);
    toast.success("Invitation declined");
    refetch();
    setActionLoading(null);
  };

  const handleAcceptTourInvite = async (tourClubId: string, tourId: string) => {
    setActionLoading(tourClubId);
    await supabase.from("tour_clubs").update({ status: "accepted" }).eq("id", tourClubId);
    toast.success("Tournament invitation accepted!");
    navigate(`/tour/${tourId}`);
    refetch();
    setActionLoading(null);
  };

  const handleDeclineTourInvite = async (tourClubId: string) => {
    setActionLoading(tourClubId);
    await supabase.from("tour_clubs").update({ status: "declined" }).eq("id", tourClubId);
    toast.success("Invitation declined");
    refetch();
    setActionLoading(null);
  };

  const handleAcceptJoinRequest = async (inviteId: string, clubId: string, requestUserId: string) => {
    setActionLoading(inviteId);
    try {
      // Insert member dulu
      const { error: memberError } = await supabase
        .from("members")
        .insert({ 
          club_id: clubId, 
          user_id: requestUserId, 
          role: "member",
          joined_at: new Date().toISOString()
        });

      if (memberError && memberError.code !== "23505") {
        toast.error("Gagal: " + memberError.message);
        setActionLoading(null);
        return;
      }

      // Baru update invitation ke accepted
      await supabase
        .from("club_invitations")
        .update({ status: "accepted" })
        .eq("id", inviteId);

      toast.success("Member berhasil ditambahkan!");
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    }
    setActionLoading(null);
  };

  const handleDeclineJoinRequest = async (inviteId: string) => {
    setActionLoading(inviteId);
    await supabase.from("club_invitations").update({ status: "declined" }).eq("id", inviteId);
    toast.success("Request ditolak");
    refetch();
    setActionLoading(null);
  };

  const iconMap: Record<string, React.ElementType> = {
    buddy_request: UserPlus,
    club_invite: Building2,
    upcoming_event: Calendar,
    handicap_update: TrendingDown,
    event_result: Trophy,
    tournament_invite: Trophy,
    join_request: UserPlus,
    tournament_update: Trophy,
  };

  const handleTap = (n: NotificationItem) => {
    if (n.type === "upcoming_event" || n.type === "event_result") {
      navigate(`/event/${n.meta?.eventId}`);
    }
    if (n.type === "tournament_invite" || n.type === "tournament_update") {
      if (n.meta?.tour_id) navigate(`/tour/${n.meta.tour_id}`);
      else if (n.meta?.tourId) navigate(`/tour/${n.meta.tourId}`);
    }
    if (n.type === "join_request") {
      navigate(`/clubs/${n.meta?.clubId}`);
    }
    // Mark tournament_update as read on tap
    if (n.type === "tournament_update" && n.meta?.notifId) {
      supabase.from("notifications").update({ is_read: true }).eq("id", n.meta.notifId).then(() => {});
    }
  };

  return (
    <div className="bottom-nav-safe">
      <AppHeader title="Notifications" icon={<Bell className="h-5 w-5 text-primary" />} />

      <div className="divide-y divide-border/30">
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}

        {!isLoading && (!notifications || notifications.length === 0) && (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Bell className="h-8 w-8 text-primary/60" />
            </div>
            <p className="text-base font-semibold">No notifications yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Notifikasi klub, tournament, dan aktivitas teman akan muncul di sini.
            </p>
          </div>
        )}

        {notifications?.map((n) => {
          const Icon = iconMap[n.type] ?? Bell;
          return (
            <div
              key={n.id}
              className="flex gap-3 px-4 py-3.5 hover:bg-secondary/30 transition-colors cursor-pointer"
              onClick={() => handleTap(n)}
            >
              {n.avatar ? (
                <Avatar className="h-10 w-10 border border-primary/20">
                  <AvatarImage src={n.avatar} />
                  <AvatarFallback className="bg-secondary"><Icon className="h-4 w-4" /></AvatarFallback>
                </Avatar>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.subtitle}</p>

                {n.type === "buddy_request" && n.actionable && (
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); handleAcceptBuddy(n.meta.connectionId); }} disabled={actionLoading === n.meta.connectionId}>
                      <Check className="h-3 w-3 mr-1" /> Accept
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); handleDeclineBuddy(n.meta.connectionId); }} disabled={actionLoading === n.meta.connectionId}>
                      <X className="h-3 w-3 mr-1" /> Decline
                    </Button>
                  </div>
                )}

                {n.type === "club_invite" && n.actionable && (
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); handleAcceptClub(n.meta.inviteId, n.meta.clubId); }} disabled={actionLoading === n.meta.inviteId}>
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); handleDeclineClub(n.meta.inviteId); }} disabled={actionLoading === n.meta.inviteId}>
                      Decline
                    </Button>
                  </div>
                )}

                {n.type === "tournament_invite" && n.actionable && (
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" className="h-7 text-xs gap-1"
                      onClick={(e) => { e.stopPropagation(); handleAcceptTourInvite(n.meta.tourClubId, n.meta.tourId); }}
                      disabled={actionLoading === n.meta.tourClubId}
                    >
                      <Check className="h-3 w-3" /> Terima
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                      onClick={(e) => { e.stopPropagation(); handleDeclineTourInvite(n.meta.tourClubId); }}
                      disabled={actionLoading === n.meta.tourClubId}
                    >
                      <X className="h-3 w-3" /> Tolak
                    </Button>
                  </div>
                )}

                {n.type === "join_request" && n.actionable === true && (
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" className="h-7 text-xs gap-1"
                      onClick={(e) => { e.stopPropagation(); handleAcceptJoinRequest(n.meta.inviteId, n.meta.clubId, n.meta.userId); }}
                      disabled={actionLoading === n.meta.inviteId}
                    >
                      <Check className="h-3 w-3" /> Terima
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                      onClick={(e) => { e.stopPropagation(); handleDeclineJoinRequest(n.meta.inviteId); }}
                      disabled={actionLoading === n.meta.inviteId}
                    >
                      <X className="h-3 w-3" /> Tolak
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
                      onClick={(e) => { e.stopPropagation(); navigate(`/clubs/${n.meta.clubId}`); }}
                    >
                      Lihat Club →
                    </Button>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">{n.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Notifications;
