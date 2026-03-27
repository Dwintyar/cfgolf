import { ArrowLeft, Globe, Mail, Camera, UserPlus, UserCheck, MessageCircle, Crown, Check, X, BarChart3, TrendingDown, Trophy, MapPin, Settings, Clock, Share2, Shield, CalendarDays, Loader2, ClipboardList } from "lucide-react";
import CommitteeRoleBadges from "@/components/CommitteeRoleBadges";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import CreateClubDialog from "@/components/CreateClubDialog";

type Tab = "about" | "clubs" | "stats" | "gallery" | "bookings";
type DesktopTab = "overview" | "stats" | "history";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  handicap: number | null;
}

interface Club {
  id: string;
  name: string;
  logo_url: string | null;
  is_personal?: boolean;
  facility_type?: string;
}

const GolferProfile = () => {
  const navigate = useNavigate();
  const { id: paramId } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("about");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [desktopTab, setDesktopTab] = useState<DesktopTab>("overview");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [buddyStatus, setBuddyStatus] = useState<string | null>(null);
  const [buddyConnectionId, setBuddyConnectionId] = useState<string | null>(null);
  const [showCreateClub, setShowCreateClub] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false
  );

  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const targetId = paramId || currentUserId;

  const fetchClubs = async (tid: string) => {
    const { data: membersData } = await supabase
      .from("members")
      .select("club_id, clubs(id, name, logo_url, is_personal, facility_type)")
      .eq("user_id", tid);
    const { data: personalClub } = await supabase
      .from("clubs")
      .select("id, name, logo_url, is_personal, facility_type")
      .eq("owner_id", tid)
      .eq("is_personal", true)
      .maybeSingle();
    const memberClubs: Club[] = (membersData || []).map((m: any) => m.clubs).filter(Boolean);
    if (personalClub && !memberClubs.find((c) => c.id === personalClub.id)) {
      memberClubs.unshift(personalClub);
    }
    memberClubs.sort((a, b) => (a.is_personal ? -1 : 0) - (b.is_personal ? -1 : 0));
    setClubs(memberClubs);
  };

  const fetchInvites = async (tid: string) => {
    const { data } = await supabase
      .from("club_invitations")
      .select("*, clubs(id, name, logo_url)")
      .eq("invited_user_id", tid)
      .eq("status", "pending");
    setPendingInvites(data || []);
  };

  const handleAcceptInvite = async (inviteId: string, clubId: string) => {
    if (!currentUserId) return;
    await supabase.from("club_invitations").update({ status: "accepted" }).eq("id", inviteId);
    await supabase.from("members").insert({ club_id: clubId, user_id: currentUserId, role: "member" });
    toast({ title: "Berhasil bergabung!" });
    if (targetId) { fetchClubs(targetId); fetchInvites(targetId); }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    await supabase.from("club_invitations").update({ status: "declined" }).eq("id", inviteId);
    toast({ title: "Undangan ditolak" });
    if (targetId) fetchInvites(targetId);
  };

  const handleAcceptBuddy = async (connectionId: string) => {
    const { error } = await supabase.from("buddy_connections").update({ status: "accepted" }).eq("id", connectionId);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { setBuddyStatus("accepted"); toast({ title: "Buddy diterima!" }); }
  };

  const handleDeclineBuddy = async (connectionId: string) => {
    const { error } = await supabase.from("buddy_connections").update({ status: "declined" }).eq("id", connectionId);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { setBuddyStatus(null); setBuddyConnectionId(null); toast({ title: "Permintaan ditolak" }); }
  };

  const handleRemoveBuddy = async () => {
    if (!buddyConnectionId) return;
    const { error } = await supabase.from("buddy_connections").delete().eq("id", buddyConnectionId);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { setBuddyStatus(null); setBuddyConnectionId(null); toast({ title: "Buddy dihapus" }); }
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setCurrentUserId(user.id);
      const tid = paramId || user.id;
      setIsOwnProfile(tid === user.id);
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", tid).single();
      if (profileData) setProfile(profileData);
      await fetchClubs(tid);
      await fetchInvites(tid);
      if (tid !== user.id) {
        const { data: connections } = await supabase
          .from("buddy_connections")
          .select("*")
          .or(`and(requester_id.eq.${user.id},addressee_id.eq.${tid}),and(requester_id.eq.${tid},addressee_id.eq.${user.id})`)
          .limit(1);
        if (connections && connections.length > 0) {
          const conn = connections[0] as any;
          setBuddyConnectionId(conn.id);
          if (conn.status === "accepted") setBuddyStatus("accepted");
          else if (conn.status === "pending") setBuddyStatus(conn.requester_id === user.id ? "sent" : "pending");
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [navigate, paramId]);

  // Realtime subscription for profile handicap updates
  useEffect(() => {
    if (!targetId) return;
    const channel = supabase
      .channel(`profile-hcp-${targetId}`)
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${targetId}` },
        (payload: any) => {
          if (payload.new) {
            setProfile(prev => prev ? { ...prev, handicap: payload.new.handicap } : prev);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [targetId]);

  // Query last handicap update timestamp
  const { data: lastHcpUpdate } = useQuery({
    queryKey: ["last-hcp-update", targetId],
    queryFn: async () => {
      const { data } = await supabase
        .from("handicap_history")
        .select("created_at")
        .eq("player_id", targetId!)
        .order("created_at", { ascending: false })
        .limit(1);
      return data && data.length > 0 ? data[0].created_at : null;
    },
    enabled: !!targetId,
  });

  const formatHcpUpdated = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diffDays === 0) return "Updated today";
    if (diffDays === 1) return "Updated yesterday";
    if (diffDays < 30) return `Updated ${diffDays} days ago`;
    return `Updated ${date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}`;
  };

  const { data: staffPositions } = useQuery({
    queryKey: ["staff-positions", targetId],
    queryFn: async () => {
      const { data } = await supabase
        .from("club_staff")
        .select("staff_role, status, clubs(name)")
        .eq("user_id", targetId!)
        .eq("status", "active");
      return data ?? [];
    },
    enabled: !!targetId,
  });

  const { data: committeeRoles } = useQuery({
    queryKey: ["committee-roles-profile", targetId],
    queryFn: async () => {
      const { data } = await supabase
        .from("club_committee_roles")
        .select("role, tour_id, clubs!inner(name), tours(name)")
        .eq("user_id", targetId!);
      return data ?? [];
    },
    enabled: !!targetId,
  });

  const { data: hcpHistory } = useQuery({
    queryKey: ["hcp-history", targetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handicap_history")
        .select("new_hcp, old_hcp, created_at, tour_id, event_id")
        .eq("player_id", targetId!)
        .order("created_at", { ascending: true })
        .limit(50);
      if (error) console.error("hcpHistory error:", error);
      if (!data?.length) return [];
      // Ambil nama event secara terpisah agar tidak gagal jika join bermasalah
      const eventIds = [...new Set(data.map(h => h.event_id).filter(Boolean))];
      const { data: eventsData } = await supabase
        .from("events")
        .select("id, name")
        .in("id", eventIds);
      const eventMap: Record<string, string> = {};
      (eventsData ?? []).forEach((e: any) => { eventMap[e.id] = e.name; });
      return data.map(h => ({ ...h, event_name: eventMap[h.event_id] ?? null }));
    },
    enabled: !!targetId,
  });

  // Gallery — posts with images
  const { data: galleryPosts, refetch: refetchGallery } = useQuery({
    queryKey: ["gallery-posts", targetId],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, image_url, content, created_at, likes_count")
        .eq("author_id", targetId!)
        .not("image_url", "is", null)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!targetId,
  });

  // My Bookings — only load for own profile
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const { data: myBookings, refetch: refetchBookings } = useQuery({
    queryKey: ["my-bookings", targetId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tee_time_bookings")
        .select("*, courses:course_id(name, location)")
        .eq("user_id", targetId!)
        .order("booking_date", { ascending: false })
        .order("tee_time", { ascending: false });
      return data ?? [];
    },
    enabled: !!targetId && isOwnProfile,
  });

  const handleCancelBooking = async (bookingId: string) => {
    setCancellingId(bookingId);
    const { error } = await supabase
      .from("tee_time_bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId)
      .eq("user_id", userId!);
    setCancellingId(null);
    if (error) { toast({ title: "Failed to cancel booking", variant: "destructive" }); return; }
    toast({ title: "Booking cancelled" });
    refetchBookings();
  };

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/gallery/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      // Create a post with this image
      const { error: postErr } = await supabase.from("posts").insert({
        author_id: userId,
        content: "",
        category: "general",
        image_url: urlData.publicUrl,
      });
      if (postErr) throw postErr;
      toast({ title: "Foto berhasil diunggah!" });
      refetchGallery();
    } catch (err: any) {
      toast({ title: "Upload gagal", description: err.message, variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const { data: playerStats } = useQuery({
    queryKey: ["player-stats", targetId],
    queryFn: async () => {
      const { data: scorecards } = await supabase
        .from("scorecards")
        .select("gross_score, net_score, total_putts, total_score")
        .eq("player_id", targetId!)
        .gt("gross_score", 0)
        .not("gross_score", "is", null);
      if (!scorecards || scorecards.length === 0) return null;
      const rounds = scorecards.length;
      const avgGross = scorecards.reduce((s, c) => s + (c.gross_score ?? 0), 0) / rounds;
      const bestRound = Math.min(...scorecards.map(c => c.gross_score ?? 999));
      const avgPutts = scorecards.reduce((s, c) => s + (c.total_putts ?? 0), 0) / rounds;
      return { rounds, avgGross: avgGross.toFixed(1), bestRound: bestRound === 999 ? null : bestRound, avgPutts: avgPutts.toFixed(1) };
    },
    enabled: !!targetId,
  });

  const { data: tournamentHistory } = useQuery({
    queryKey: ["tournament-history", targetId],
    queryFn: async () => {
      const { data: tourPlayers } = await supabase
        .from("tour_players")
        .select("tour_id, hcp_at_registration, hcp_tour, status, created_at, clubs(name), tours(id, name, tournament_type, year)")
        .eq("player_id", targetId!)
        .in("status", ["registered", "active"])
        .order("created_at", { ascending: false });
      if (!tourPlayers?.length) return [];
      const results = await Promise.all(
        tourPlayers.map(async (tp: any) => {
          // Get all events for this tour first
          const { data: tourEvents } = await supabase
            .from("events")
            .select("id, name, event_date, status, course_id, courses(name)")
            .eq("tour_id", tp.tour_id);
          const completedEventIds = (tourEvents ?? [])
            .filter(e => e.status === "completed")
            .map(e => e.id);
          if (!completedEventIds.length) {
            return {
              tour: tp.tours as any,
              club: tp.clubs as any,
              hcpAtReg: tp.hcp_at_registration,
              hcpCurrent: tp.hcp_tour,
              events: [],
            };
          }
          const { data: contestantData } = await supabase
            .from("contestants")
            .select("hcp, event_id")
            .eq("player_id", targetId!)
            .in("event_id", completedEventIds);
          const completedEvents = (contestantData ?? []).map(c => ({
            hcp: c.hcp,
            events: tourEvents?.find(e => e.id === c.event_id),
          })).filter(c => c.events);

          // Fetch scorecard + hole scores for each completed event
          const events = await Promise.all(
            completedEvents.map(async (c: any) => {
              const ev = c.events as any;
              if (!ev) return { event: null, hcp: c.hcp, out: null, in: null, gross: null, net: null };
              // Get round_id via event_rounds (authoritative)
              const { data: erData } = await supabase
                .from("event_rounds")
                .select("round_id")
                .eq("event_id", ev.id)
                .order("round_number", { ascending: true })
                .limit(1)
                .maybeSingle();

              // Fallback: cari via course_id jika event_rounds belum ada
              let roundId = erData?.round_id ?? null;
              if (!roundId) {
                const { data: roundData } = await supabase
                  .from("rounds")
                  .select("id")
                  .eq("course_id", ev.course_id)
                  .order("created_at", { ascending: false })
                  .limit(1)
                  .maybeSingle();
                roundId = roundData?.id ?? null;
              }

              if (!roundId) return { event: ev, hcp: c.hcp, out: null, in: null, gross: null, net: null };

              // Get scorecard
              const { data: sc } = await supabase
                .from("scorecards")
                .select("id, gross_score, net_score")
                .eq("round_id", roundId)
                .eq("player_id", targetId!)
                .maybeSingle();

              if (!sc) return { event: ev, hcp: c.hcp, out: null, in: null, gross: null, net: null };

              // Get hole scores for OUT/IN
              const { data: holes } = await supabase
                .from("hole_scores")
                .select("hole_number, strokes")
                .eq("scorecard_id", sc.id);

              const out = holes?.filter(h => h.hole_number <= 9).reduce((s, h) => s + (h.strokes ?? 0), 0) ?? null;
              const inn = holes?.filter(h => h.hole_number >= 10).reduce((s, h) => s + (h.strokes ?? 0), 0) ?? null;

              // Store hole scores map for on-demand display
              const holeMap: Record<number, number> = {};
              (holes ?? []).forEach((h: any) => { holeMap[h.hole_number] = h.strokes ?? 0; });

              return {
                event: ev,
                hcp: c.hcp,
                out: out && out > 0 ? out : null,
                in: inn && inn > 0 ? inn : null,
                gross: sc.gross_score,
                net: sc.net_score,
                holeScores: holeMap,
              };
            })
          );

          return {
            tour: tp.tours as any,
            club: tp.clubs as any,
            hcpAtReg: tp.hcp_at_registration,
            hcpCurrent: tp.hcp_tour,
            events: events.sort((a, b) =>
              new Date(b.event?.event_date ?? 0).getTime() - new Date(a.event?.event_date ?? 0).getTime()
            ),
          };
        })
      );
      return results.filter(r => r.tour);
    },
    enabled: !!targetId,
  });

  const handleAddBuddy = async () => {
    if (!profile || !currentUserId) return;
    const { error } = await supabase.from("buddy_connections").insert({ requester_id: currentUserId, addressee_id: profile.id });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { setBuddyStatus("sent"); toast({ title: "Permintaan buddy terkirim!" }); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `${profile.id}/avatar.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (uploadError) { toast({ title: "Upload gagal", description: uploadError.message, variant: "destructive" }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: urlData.publicUrl, updated_at: new Date().toISOString() }).eq("id", profile.id);
    if (updateError) toast({ title: "Update gagal", description: updateError.message, variant: "destructive" });
    else { setProfile({ ...profile, avatar_url: urlData.publicUrl }); toast({ title: "Avatar berhasil diperbarui" }); }
    setUploading(false);
  };

  const getInitials = (name: string | null) => name ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) : "?";

  const tabs: { id: Tab; label: string }[] = [
    { id: "about", label: "ABOUT" },
    { id: "clubs", label: "CLUBS" },
    { id: "stats", label: "STATS" },
    { id: "gallery", label: "GALLERY" },
    ...(isOwnProfile ? [{ id: "bookings" as Tab, label: "BOOKINGS" }] : []),
  ];

  if (loading) {
    return (
      <div className="bottom-nav-safe p-6 space-y-4">
        <Skeleton className="h-28 w-28 rounded-full mx-auto" />
        <Skeleton className="h-6 w-40 mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    );
  }

  // ═══════════════════════════════════════
  // SHARED: Tournament History content
  // ═══════════════════════════════════════
  const tournamentHistoryContent = (
    <>
      {tournamentHistory && tournamentHistory.length > 0 && (
        <div className="golf-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Tournament History</p>
            <span className="text-xs text-muted-foreground ml-auto">
              {tournamentHistory.length} tournament
            </span>
          </div>
          <div className="space-y-3">
            {tournamentHistory.map((t: any, i: number) => (
              <div key={i} className="border border-border/50 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between bg-secondary/50 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate">{t.tour?.name ?? "Tournament"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {t.tour?.year} · {t.tour?.tournament_type} · {t.club?.name}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-[10px] text-muted-foreground">Tour HCP</p>
                    <p className="text-xs font-bold text-primary">{t.hcpAtReg ?? "—"} → {t.hcpCurrent ?? "—"}</p>
                  </div>
                </div>
                {t.events.length > 0 ? (
                  <div className="divide-y divide-border/30">
                    {t.events.map((e: any, j: number) => (
                      <div
                        key={j}
                        className="px-3 py-2 cursor-pointer hover:bg-primary/5 transition-colors group"
                        onClick={() => setSelectedEvent(e)}
                        title="Click to view scorecard"
                      >
                        <div className="flex items-start justify-between mb-1.5">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-medium truncate">{e.event?.name}</p>
                              <ClipboardList className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary shrink-0 transition-colors" />
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {e.event?.event_date} · {(e.event?.courses as any)?.name}
                            </p>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <p className="text-[10px] text-muted-foreground">HCP</p>
                            <p className="text-xs font-medium">{e.hcp ?? "—"}</p>
                          </div>
                        </div>
                        {(e.gross !== null || e.out !== null) && (
                          <div className="grid grid-cols-4 gap-1 mt-1">
                            {[
                              { label: "OUT", val: e.out },
                              { label: "IN", val: e.in },
                              { label: "GROSS", val: e.gross },
                              { label: "NETT", val: e.net },
                            ].map(({ label, val }) => (
                              <div key={label} className="bg-secondary/60 rounded px-1.5 py-1 text-center">
                                <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</p>
                                <p className="text-xs font-bold tabular-nums">{val ?? "—"}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground text-center py-2">Belum ada event selesai</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {(!tournamentHistory || tournamentHistory.length === 0) && (
        <div className="golf-card p-6 text-center">
          <Trophy className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">Belum mengikuti tournament</p>
        </div>
      )}
    </>
  );

  // ═══════════════════════════════════════
  // SHARED: Stats content
  // ═══════════════════════════════════════
  const statsContent = (
    <>
      {playerStats ? (
        <div className="golf-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Playing Statistics</p>
          </div>
          <div className="space-y-3">
            <StatRow label="Scoring Average" value={playerStats.avgGross} />
            <StatRow label="Best Round" value={playerStats.bestRound?.toString() ?? "—"} />
            <StatRow label="Putts per Round" value={playerStats.avgPutts} />
            <StatRow label="Rounds Played" value={playerStats.rounds.toString()} />
          </div>
        </div>
      ) : (
        <div className="golf-card p-8 text-center">
          <BarChart3 className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">No stats available yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Play some rounds to see your statistics</p>
        </div>
      )}
    </>
  );

  // ═══════════════════════════════════════
  // SHARED: HCP History by tour content
  // ═══════════════════════════════════════
  const hcpHistoryContent = hcpHistory && hcpHistory.length > 0 && (() => {
    const byTour: Record<string, { tourName: string; entries: any[] }> = {};
    hcpHistory.forEach((h: any) => {
      const key = h.tour_id ?? "personal";
      if (!byTour[key]) {
        byTour[key] = {
          tourName: h.tour_id ? ((h.tours as any)?.name ?? "Tournament") : "Personal",
          entries: [],
        };
      }
      byTour[key].entries.push(h);
    });
    return Object.entries(byTour).map(([key, group]) => (
      <div key={key} className="golf-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">{group.tourName}</p>
          {key !== "personal" && (
            <Badge variant="outline" className="text-[9px]">Tournament HCP</Badge>
          )}
        </div>
        <div className="space-y-2">
          {group.entries.map((h: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate flex-1">{h.event_name ?? (h.events as any)?.name ?? "Event"}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-muted-foreground">{h.old_hcp ?? "?"}</span>
                <span>→</span>
                <span className="font-bold">{h.new_hcp ?? "?"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ));
  })();

  // ═══════════════════════════════════════
  // SHARED: HCP Trend mini chart
  // ═══════════════════════════════════════
  const hcpTrendChart = hcpHistory && hcpHistory.length > 0 && (() => {
    const hcpValues = hcpHistory.map((h: any) => h.new_hcp ?? 0);
    const minHcp = Math.max(0, Math.min(...hcpValues) - 2);
    const maxHcp = Math.max(...hcpValues) + 2;
    const range = maxHcp - minHcp || 1;
    const W = 300; const H = 80; const PAD = 8;
    const points = hcpValues.map((v: number, i: number) => {
      const x = PAD + (i / Math.max(hcpValues.length - 1, 1)) * (W - PAD * 2);
      const y = H - PAD - ((v - minHcp) / range) * (H - PAD * 2);
      return { x, y, v };
    });
    const polyline = points.map((p: any) => `${p.x},${p.y}`).join(" ");
    const areaPath = `M${points[0].x},${H - PAD} ` +
      points.map((p: any) => `L${p.x},${p.y}`).join(" ") +
      ` L${points[points.length-1].x},${H - PAD} Z`;

    return (
      <div className="golf-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Handicap History</p>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }}>
          {/* Area fill */}
          <path d={areaPath} fill="hsl(var(--primary))" opacity="0.1" />
          {/* Line */}
          <polyline points={polyline} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {/* Dots + labels */}
          {points.map((p: any, i: number) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="3" fill="hsl(var(--primary))" />
              <text x={p.x} y={p.y - 6} textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.6">{p.v}</text>
            </g>
          ))}
        </svg>
        <p className="text-[10px] text-muted-foreground mt-1 text-center">
          Current: HCP {profile?.handicap ?? "N/A"}
        </p>
      </div>
    );
  })();

  // ═══════════════════════════════════════
  // DESKTOP LAYOUT
  // ═══════════════════════════════════════
  if (isDesktop) {
    return (
      <div className="w-full bottom-nav-safe">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

        <div className="flex gap-6 p-6 items-start">
          {/* KOLOM KIRI (35%) — Profile card sticky */}
          <div className="w-80 shrink-0 space-y-4 sticky top-20">
            {/* Profile card utama */}
            <div className="golf-card overflow-hidden">
              {/* Cover photo */}
              <div className="h-24 bg-gradient-to-br from-primary/30 to-primary/10 relative">
                {isOwnProfile && (
                  <button className="absolute bottom-2 right-2 bg-background/80 rounded-full p-1.5 hover:bg-background transition-colors">
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {/* Avatar + info */}
              <div className="px-4 pb-4">
                <div className="-mt-8 mb-3 relative inline-block">
                  <Avatar className="h-16 w-16 border-4 border-background">
                    <AvatarImage src={profile?.avatar_url ?? ""} />
                    <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  {isOwnProfile && (
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                      className="absolute bottom-0 right-0 rounded-full bg-primary p-1 text-primary-foreground shadow-lg">
                      <Camera className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <h1 className="text-lg font-bold">{profile?.full_name ?? "Unnamed Golfer"}</h1>

                {staffPositions && staffPositions.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {staffPositions.map((sp: any, i: number) => (
                      <Badge key={i} variant="secondary" className="text-[10px] mr-1">
                        {sp.staff_role} — {(sp.clubs as any)?.name}
                      </Badge>
                    ))}
                  </div>
                )}

                {profile?.location && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {profile.location}
                  </p>
                )}

                {profile?.bio && (
                  <p className="text-xs text-muted-foreground mt-2 italic">{profile.bio}</p>
                )}

                {/* HCP + Rounds badges */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="golf-card px-4 py-2 text-center flex-1 border-primary/30">
                    <p className="text-2xl font-bold text-primary">{profile?.handicap ?? "N/A"}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Handicap</p>
                  </div>
                  <div className="golf-card px-4 py-2 text-center flex-1">
                    <p className="text-2xl font-bold">{playerStats?.rounds ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Rounds</p>
                  </div>
                </div>
                {formatHcpUpdated(lastHcpUpdate) && (
                  <p className="text-[10px] text-muted-foreground mt-1 text-center">{formatHcpUpdated(lastHcpUpdate)}</p>
                )}


                <div className="mt-3 space-y-2">
                  {!isOwnProfile && (
                    <>
                      {buddyStatus === "accepted" ? (
                        <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleRemoveBuddy}>
                          <UserCheck className="h-4 w-4" /> Buddies
                        </Button>
                      ) : buddyStatus === "sent" ? (
                        <Button variant="outline" size="sm" className="w-full gap-2" disabled>
                          <Clock className="h-4 w-4" /> Request Sent
                        </Button>
                      ) : buddyStatus === "pending" ? (
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1 gap-1" onClick={() => handleAcceptBuddy(buddyConnectionId!)}>
                            <Check className="h-3.5 w-3.5" /> Accept
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => handleDeclineBuddy(buddyConnectionId!)}>
                            <X className="h-3.5 w-3.5" /> Decline
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" className="w-full gap-2" onClick={handleAddBuddy}>
                          <UserPlus className="h-4 w-4" /> Add Buddy
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => navigate(`/chat/${profile?.id}`)}>
                        <MessageCircle className="h-4 w-4" /> Send Message
                      </Button>
                    </>
                  )}
                  {isOwnProfile && (
                    <>
                      <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => navigate("/settings")}>
                        <Settings className="h-4 w-4" /> Edit Profile
                      </Button>
                      <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => {
                        const un = (profile as any)?.username;
                        if (un) {
                          const url = `${window.location.origin}/p/${un}`;
                          navigator.clipboard.writeText(url);
                          toast({ title: "Link profil disalin! Bagikan ke WhatsApp 🏌️" });
                        }
                      }}>
                        <Share2 className="h-4 w-4" /> Share Profile
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Stats card */}
            {playerStats && (
              <div className="golf-card p-4 space-y-3">
                <p className="text-sm font-semibold">Playing Stats</p>
                {[
                  { label: "Scoring Average", value: playerStats.avgGross },
                  { label: "Best Round", value: playerStats.bestRound?.toString() ?? "—" },
                  { label: "Putts per Round", value: playerStats.avgPutts },
                  { label: "Rounds Played", value: playerStats.rounds.toString() },
                ].map(s => (
                  <div key={s.label} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="font-semibold">{s.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Clubs */}
            {clubs && clubs.length > 0 && (
              <div className="golf-card p-4">
                <p className="text-sm font-semibold mb-3">Clubs</p>
                <div className="space-y-2">
                  {clubs.map((c: any) => (
                    <button key={c.id} onClick={() => navigate(`/clubs/${c.id}`)}
                      className="flex items-center gap-2 w-full hover:opacity-70 transition-opacity text-left">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage src={c.logo_url ?? ""} />
                        <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-bold text-primary">
                          {c.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">
                          {c.facility_type?.replace("_", " ") ?? "Club"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Committee Roles */}
            {committeeRoles && committeeRoles.length > 0 && (
              <div className="golf-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">Club Roles</p>
                </div>
                <div className="space-y-2">
                  {committeeRoles.map((cr: any, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <CommitteeRoleBadges roles={[cr.role]} />
                      <p className="text-[10px] text-muted-foreground leading-4">
                        {cr.tours?.name
                          ? `${cr.tours.name} @ ${(cr.clubs as any)?.name}`
                          : `${(cr.clubs as any)?.name} (All Tours)`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* KOLOM KANAN (65%) — Tabs konten */}
          <div className="flex-1 min-w-0">
            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-border/50">
              {(["overview", "stats", "history"] as DesktopTab[]).map(t => (
                <button key={t} onClick={() => setDesktopTab(t)}
                  className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors relative
                    ${desktopTab === t ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  {t === "overview" ? "Overview" : t === "stats" ? "Statistics" : "Tournament History"}
                  {desktopTab === t && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab: Overview */}
            {desktopTab === "overview" && (
              <div className="space-y-4">
                {hcpTrendChart}

                <div className="golf-card p-4">
                  <p className="text-sm font-semibold mb-3">Recent Rounds</p>
                  {playerStats ? (
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-primary">{playerStats.bestRound ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">Best Score</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{playerStats.avgGross}</p>
                        <p className="text-xs text-muted-foreground">Avg Score</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{playerStats.avgPutts}</p>
                        <p className="text-xs text-muted-foreground">Avg Putts</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Belum ada data round</p>
                  )}
                </div>

                {/* About info */}
                <div className="golf-card p-4 space-y-3">
                  <p className="text-sm font-semibold">About</p>
                  <p className="text-sm text-muted-foreground italic">{profile?.bio || "No bio yet"}</p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Globe className="h-4 w-4 shrink-0" />
                    <span>No website linked</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span>Contact via Message</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Statistics */}
            {desktopTab === "stats" && (
              <div className="space-y-4">
                {statsContent}
                {hcpHistoryContent}
              </div>
            )}

            {/* Tab: Tournament History */}
            {desktopTab === "history" && (
              <div className="space-y-4">
                {tournamentHistoryContent}
              </div>
            )}
          </div>
        </div>

        <CreateClubDialog open={showCreateClub} onOpenChange={setShowCreateClub} onCreated={async () => { setShowCreateClub(false); if (targetId) await fetchClubs(targetId); }} />
      </div>
    );
  }

  // ═══════════════════════════════════════
  // MOBILE LAYOUT — unchanged
  // ═══════════════════════════════════════
  return (
    <div className="bottom-nav-safe">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

      <div className="px-4 pt-4">
        <div>
          <div className="relative bg-gradient-to-b from-secondary to-background pb-6 rounded-xl">
            <button onClick={() => navigate(-1)} className="absolute left-4 top-4 z-10 rounded-full bg-background/40 p-2 backdrop-blur">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex flex-col items-center pt-14">
              <div className="relative">
                <Avatar className="h-28 w-28 border-4 border-primary/50">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "Avatar"} />
                  <AvatarFallback className="bg-primary text-3xl font-bold text-primary-foreground">{getInitials(profile?.full_name)}</AvatarFallback>
                </Avatar>
                {isOwnProfile && (
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-primary-foreground shadow-lg">
                    <Camera className="h-4 w-4" />
                  </button>
                )}
              </div>
              <h1 className="mt-3 font-display text-xl font-bold">{profile?.full_name || "Unnamed Golfer"}</h1>
              {staffPositions && staffPositions.length > 0 && (
                <div className="mt-1 flex flex-wrap justify-center gap-1">
                  {staffPositions.map((sp: any, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {sp.staff_role} — {(sp.clubs as any)?.name}
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{profile?.location || "No location set"}</p>
              <div className="mt-4 flex gap-3 px-8 w-full">
                <Badge variant="outline" className="flex-1 justify-center rounded-lg border-border px-4 py-2.5 text-sm font-bold">HCP {profile?.handicap ?? "N/A"}</Badge>
                <Badge variant="outline" className="flex-1 justify-center rounded-lg border-border px-4 py-2.5 text-sm font-bold">{clubs.length} CLUBS</Badge>
              </div>
              {formatHcpUpdated(lastHcpUpdate) && (
                <p className="text-[10px] text-muted-foreground mt-1">{formatHcpUpdated(lastHcpUpdate)}</p>
              )}
              {!isOwnProfile && (
                <div className="mt-4 flex gap-3 px-8 w-full">
                  <Button variant="outline" className="flex-1 h-11 rounded-xl text-sm font-bold uppercase tracking-wider border-border" onClick={() => navigate("/chat")}>
                    <MessageCircle className="h-4 w-4 mr-2" /> Message
                  </Button>
                  {buddyStatus === "accepted" ? (
                    <Button className="flex-1 h-11 rounded-xl text-sm font-bold uppercase tracking-wider" variant="outline" disabled><UserCheck className="h-4 w-4 mr-2" /> Buddies</Button>
                  ) : buddyStatus === "sent" ? (
                    <Button className="flex-1 h-11 rounded-xl text-sm font-bold uppercase tracking-wider" variant="outline" disabled>Requested</Button>
                  ) : (
                    <Button className="flex-1 h-11 rounded-xl text-sm font-bold uppercase tracking-wider" onClick={handleAddBuddy}><UserPlus className="h-4 w-4 mr-2" /> Add Buddy</Button>
                  )}
                </div>
              )}
              {isOwnProfile && (
                <div className="mt-4 flex gap-3 px-8 w-full">
                  <Button variant="outline" className="flex-1 h-11 rounded-xl text-sm font-bold uppercase tracking-wider border-border" onClick={() => navigate("/settings")}>Edit Profile</Button>
                  <Button variant="outline" className="flex-1 h-11 rounded-xl text-sm font-bold uppercase tracking-wider border-border gap-2" onClick={() => {
                    const un = (profile as any)?.username;
                    if (un) {
                      const url = `${window.location.origin}/p/${un}`;
                      navigator.clipboard.writeText(url);
                      toast({ title: "Link profil disalin! Bagikan ke WhatsApp 🏌️" });
                    }
                  }}>
                    <Share2 className="h-4 w-4" /> Share
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4">
          {/* Tabs */}
          <div className="flex items-center justify-center gap-6 border-b border-border/50 px-4">
            {tabs.map((t) => (
              <div key={t.id} className="flex items-center gap-3">
                <button onClick={() => setTab(t.id)} className={`relative py-3 text-sm font-semibold tracking-wider transition-colors ${tab === t.id ? "text-foreground" : "text-muted-foreground"}`}>
                  {t.label}
                  {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
                </button>
                {t.id === "clubs" && isOwnProfile && (
                  <button onClick={() => setShowCreateClub(true)} className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">+</button>
                )}
              </div>
            ))}
          </div>

          {/* Tab content */}
          <div className="px-4 pt-4 pb-4">
            {tab === "about" && (
              <div className="space-y-4 animate-fade-in">
                <div className="px-2">
                  <p className="text-sm italic text-muted-foreground">{profile?.bio || "No bio yet"}</p>
                </div>
                <div className="golf-card p-4 flex items-start gap-4">
                  <Globe className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">No website linked</p>
                </div>
                <div className="golf-card p-4 flex items-center gap-4">
                  <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
                  <p className="text-sm text-muted-foreground">Contact via Message</p>
                </div>
                {hcpTrendChart}
              </div>
            )}

            {tab === "clubs" && (
              <div className="animate-fade-in space-y-4">
                {isOwnProfile && pendingInvites.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Undangan Klub</p>
                    {pendingInvites.map((inv: any) => {
                      const club = inv.clubs as any;
                      return (
                        <div key={inv.id} className="golf-card p-3 flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-primary/30">
                            <AvatarImage src={club?.logo_url ?? ""} />
                            <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">{club?.name?.charAt(0) ?? "?"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{club?.name}</p>
                            <p className="text-xs text-muted-foreground">Mengundang Anda</p>
                          </div>
                          <div className="flex gap-1.5">
                            <button onClick={() => handleAcceptInvite(inv.id, inv.club_id)} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-4 w-4" /></button>
                            <button onClick={() => handleDeclineInvite(inv.id)} className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive"><X className="h-4 w-4" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {clubs.length === 0 && pendingInvites.length === 0 && (
                    <p className="col-span-2 text-center text-sm text-muted-foreground py-8">Belum bergabung dengan klub manapun</p>
                  )}
                  {clubs.map((c, i) => (
                    <div key={c.id} onClick={() => navigate(`/clubs/${c.id}`)} className="golf-card overflow-hidden animate-fade-in cursor-pointer" style={{ animationDelay: `${i * 60}ms` }}>
                      <div className="relative h-28 bg-secondary flex items-center justify-center">
                        {c.logo_url ? <img src={c.logo_url} alt={c.name} className="h-full w-full object-cover" /> : <span className="text-3xl font-bold text-primary/30">{c.name.charAt(0)}</span>}
                        {c.is_personal && (
                          <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[9px] font-bold text-primary-foreground uppercase tracking-wider"><Crown className="h-3 w-3" /> Personal</span>
                        )}
                      </div>
                      <p className="p-2.5 text-xs font-medium truncate">{c.name}</p>
                    </div>
                  ))}
                </div>

                {/* Committee Roles section in mobile clubs tab */}
                {committeeRoles && committeeRoles.length > 0 && (
                  <div className="golf-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold">Club Roles</p>
                    </div>
                    <div className="space-y-2">
                      {committeeRoles.map((cr: any, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                          <CommitteeRoleBadges roles={[cr.role]} />
                          <p className="text-[10px] text-muted-foreground leading-4">
                            {cr.tours?.name
                              ? `${cr.tours.name} @ ${(cr.clubs as any)?.name}`
                              : `${(cr.clubs as any)?.name} (All Tours)`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "stats" && (
              <div className="space-y-4 animate-fade-in">
                {tournamentHistoryContent}
                {statsContent}
                {hcpHistoryContent}
              </div>
            )}

            {tab === "gallery" && (
              <div className="animate-fade-in space-y-3">
                {/* Upload button — own profile only */}
                {isOwnProfile && (
                  <div>
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleGalleryUpload}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 h-9"
                      disabled={uploadingPhoto}
                      onClick={() => galleryInputRef.current?.click()}
                    >
                      <Camera className="h-4 w-4" />
                      {uploadingPhoto ? "Uploading..." : "Add Photo"}
                    </Button>
                  </div>
                )}

                {/* Photo grid */}
                {galleryPosts && galleryPosts.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1">
                    {galleryPosts.map((p: any) => (
                      <div key={p.id} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                        <img
                          src={p.image_url}
                          alt="Gallery photo"
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                        />
                        {p.likes_count > 0 && (
                          <div className="absolute bottom-1 right-1 bg-black/50 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                            <span className="text-[9px] text-white">♥ {p.likes_count}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Camera className="h-8 w-8 text-primary/60" />
                    </div>
                    <p className="text-base font-semibold">No photos yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isOwnProfile ? "Tap tombol di atas untuk tambah foto pertama." : "Belum ada foto yang dibagikan."}
                    </p>
                  </div>
                )}
              </div>
            )}

            {tab === "bookings" && isOwnProfile && (
              <div className="animate-fade-in space-y-3">
                {!myBookings || myBookings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <CalendarDays className="h-8 w-8 text-primary/60" />
                    </div>
                    <p className="text-base font-semibold">No bookings yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Book tee times from the Venues page.</p>
                  </div>
                ) : (
                  myBookings.map((b: any) => {
                    const isPast = b.booking_date < new Date().toISOString().split("T")[0];
                    const isCancelled = b.status === "cancelled";
                    const statusColor = isCancelled
                      ? "text-red-400 bg-red-400/10"
                      : isPast
                      ? "text-muted-foreground bg-muted"
                      : "text-green-400 bg-green-400/10";
                    const statusLabel = isCancelled ? "Cancelled" : isPast ? "Completed" : "Confirmed";

                    return (
                      <div key={b.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm leading-tight">
                              {(b.courses as any)?.name ?? "Golf Course"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {(b.courses as any)?.location ?? ""}
                            </p>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {new Date(b.booking_date).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {b.tee_time}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{b.players_count} pemain · Rp {Number(b.total_price ?? 0).toLocaleString("id-ID")}</span>
                          {!isCancelled && !isPast && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10"
                              disabled={cancellingId === b.id}
                              onClick={() => handleCancelBooking(b.id)}
                            >
                              {cancellingId === b.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : "Cancel"}
                            </Button>
                          )}
                        </div>

                        {b.notes && (
                          <p className="text-xs text-muted-foreground italic border-t border-border pt-2">
                            "{b.notes}"
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateClubDialog open={showCreateClub} onOpenChange={setShowCreateClub} onCreated={async () => { setShowCreateClub(false); if (targetId) await fetchClubs(targetId); }} />

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedEvent(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 px-5 py-4 border-b border-border/50">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground truncate">{selectedEvent.event?.name ?? "Event"}</p>
                <p className="text-xs text-muted-foreground">{selectedEvent.event?.event_date} · {(selectedEvent.event?.courses as any)?.name}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Gross</p>
                  <p className="text-xl font-bold tabular-nums">{selectedEvent.gross ?? "—"}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-primary/70 uppercase">Nett</p>
                  <p className="text-2xl font-extrabold text-primary tabular-nums">{selectedEvent.net ?? "—"}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">HCP</p>
                  <p className="text-xl font-bold tabular-nums">{selectedEvent.hcp ?? "—"}</p>
                </div>
                <button onClick={() => setSelectedEvent(null)} className="text-muted-foreground hover:text-foreground text-xl leading-none ml-1">✕</button>
              </div>
            </div>
            <div className="px-5 py-4">
              {selectedEvent.holeScores && Object.keys(selectedEvent.holeScores).length > 0 ? (
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
                                {selectedEvent.holeScores[h] ?? <span className="text-muted-foreground/30">—</span>}
                              </td>
                            ))}
                            <td className="text-center py-1.5 px-1 font-bold tabular-nums">
                              {holes.reduce((s: number, h: number) => s + (selectedEvent.holeScores[h] ?? 0), 0) || "—"}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ))}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/50">
                    {([
                      { label: "OUT", val: [1,2,3,4,5,6,7,8,9].reduce((s: number, h: number) => s+(selectedEvent.holeScores[h]??0), 0), highlight: false },
                      { label: "IN",  val: [10,11,12,13,14,15,16,17,18].reduce((s: number, h: number) => s+(selectedEvent.holeScores[h]??0), 0), highlight: false },
                      { label: "GROSS", val: selectedEvent.gross, highlight: true },
                    ] as { label: string; val: any; highlight: boolean }[]).map(({ label, val, highlight }) => (
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
                  <p className="text-xs mt-1 text-muted-foreground/50">Gross: {selectedEvent.gross ?? "—"} · Nett: {selectedEvent.net ?? "—"}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-sm font-bold">{value}</span>
  </div>
);

export default GolferProfile;
