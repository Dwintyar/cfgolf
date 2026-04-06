import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, UserCheck, UserX, Calendar, Bell, ChevronRight, Plus, ArrowLeft,
  Settings as SettingsIcon, Building2, Shield, Trash2, MessageSquare,
  Crown, AlertTriangle, MapPin, ChevronDown, ChevronUp, Trophy, Megaphone, DollarSign, Clock,
  Check, X, Loader2
} from "lucide-react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import InviteMemberDialog from "@/components/InviteMemberDialog";
import AssignEventRolesDialog from "@/components/tour/AssignEventRolesDialog";
import CreateTourDialog from "@/components/tour/CreateTourDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Pin, MoreVertical } from "lucide-react";
import { useFeatureFlags } from "@/hooks/use-feature-flags";

const ClubAdminDashboard = () => {
  const { clubId: paramClubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { flags } = useFeatureFlags();
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("members");
  const [memberSearch, setMemberSearch] = useState("");
  const [sortBy, setSortBy] = useState<"role" | "name">("role");
  const [showInvite, setShowInvite] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState(paramClubId ?? "");
  const [expandedTours, setExpandedTours] = useState<Set<string>>(new Set());

  // Settings form
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);

  // Succession
  const [successionUserId, setSuccessionUserId] = useState("");
  const [transferTargetId, setTransferTargetId] = useState("");

  // Announcements
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annPinned, setAnnPinned] = useState(false);

  // Event roles
  const [rolesEventId, setRolesEventId] = useState<string | null>(null);

  // Create tour
  const [showCreateTour, setShowCreateTour] = useState(false);

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

  // Linked course detection
  const { data: linkedCourse } = useQuery({
    queryKey: ["club-linked-course", clubId],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, name, par, holes_count, green_fee_price, image_url")
        .eq("club_id", clubId)
        .maybeSingle();
      return data;
    },
    enabled: !!clubId,
  });

  const isVenue = club?.club_type === "venue";
  const isGolfCourse = !!linkedCourse && isVenue;
  const isDrivingRange = club?.facility_type === "driving_range";
  const isCommunity = !isVenue && !isDrivingRange;

  // Reset to appropriate default tab when club type loads
  useEffect(() => {
    if (!club) return;
    if (isVenue) setActiveTab("staff");
    else if (isDrivingRange) setActiveTab("members");
    else setActiveTab("members");
  }, [club?.id, isVenue, isDrivingRange]);

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
        .eq("club_id", clubId);
      return data ?? [];
    },
    enabled: !!clubId,
  });

  // Staff roles map
  const { data: staffRoles } = useQuery({
    queryKey: ["club-staff-roles", clubId],
    queryFn: async () => {
      const { data } = await supabase
        .from("club_staff")
        .select("user_id, staff_role")
        .eq("club_id", clubId!)
        .eq("status", "active");
      return Object.fromEntries(
        (data ?? []).map(s => [s.user_id, s.staff_role])
      );
    },
    enabled: !!clubId,
  });

  // Staff (active only)
  const { data: staff, refetch: refetchStaff } = useQuery({
    queryKey: ["club-admin-staff", clubId],
    queryFn: async () => {
      const { data } = await supabase
        .from("club_staff")
        .select("*, profiles(full_name, avatar_url)")
        .eq("club_id", clubId)
        .eq("status", "active")
        .order("staff_role");
      return data ?? [];
    },
    enabled: !!clubId,
  });

  // Pending staff requests
  const { data: pendingStaff, refetch: refetchPendingStaff } = useQuery({
    queryKey: ["club-pending-staff", clubId],
    queryFn: async () => {
      const { data } = await supabase
        .from("club_staff")
        .select("*, profiles(full_name, avatar_url, handicap)")
        .eq("club_id", clubId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!clubId,
  });

  // Tours with events (organized + participating)
  const { data: clubTours } = useQuery({
    queryKey: ["club-admin-tours", clubId],
    queryFn: async () => {
      // Tour yang diselenggarakan klub ini
      const { data: organizedTours } = await supabase
        .from("tours")
        .select("*, events(id, name, event_date, status, contestants(id))")
        .eq("organizer_club_id", clubId)
        .order("year", { ascending: false });

      // Tour yang diikuti sebagai peserta
      const { data: participatingTourClubs } = await supabase
        .from("tour_clubs")
        .select("tour_id, ticket_quota, status")
        .eq("club_id", clubId)
        .eq("status", "accepted");

      let participatingTours: any[] = [];
      if (participatingTourClubs && participatingTourClubs.length > 0) {
        const organizedIds = new Set((organizedTours ?? []).map((t: any) => t.id));
        const participatingIds = participatingTourClubs
          .map(tc => tc.tour_id)
          .filter(id => !organizedIds.has(id));

        if (participatingIds.length > 0) {
          const { data } = await supabase
            .from("tours")
            .select("*, events(id, name, event_date, status, contestants(id))")
            .in("id", participatingIds)
            .order("year", { ascending: false });
          participatingTours = data ?? [];
        }
      }

      const organized = (organizedTours ?? []).map((t: any) => ({ ...t, clubRole: "organizer" }));
      const participating = participatingTours.map((t: any) => ({ ...t, clubRole: "participant" }));
      return [...organized, ...participating];
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

  // Pending join requests
  const { data: joinRequests, refetch: refetchRequests } = useQuery({
    queryKey: ["club-join-requests", clubId],
    queryFn: async () => {
      const { data } = await supabase
        .from("club_invitations")
        .select("*, profiles:invited_user_id(full_name, avatar_url, handicap)")
        .eq("club_id", clubId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      return (data ?? []).filter((r: any) => r.invited_by === r.invited_user_id);
    },
    enabled: !!clubId,
  });

  // Announcements
  const { data: announcements, refetch: refetchAnnouncements } = useQuery({
    queryKey: ["club-announcements", clubId],
    queryFn: async () => {
      const { data } = await supabase
        .from("club_announcements")
        .select("*, profiles:author_id(full_name)")
        .eq("club_id", clubId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!clubId,
  });

  // Tour players registered by this club
  const { data: clubTourPlayers } = useQuery({
    queryKey: ["club-tour-players", clubId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tour_players")
        .select("*, profiles(full_name, handicap), tours(name, id)")
        .eq("club_id", clubId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!clubId,
  });

  const { data: courseBookings, refetch: refetchCourseBookings } = useQuery({
    queryKey: ["club-venue-bookings", linkedCourse?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("tee_time_bookings")
        .select("id, booking_date, tee_time, status, players_count, notes, total_price, user_id, profiles:user_id(full_name, avatar_url)")
        .eq("course_id", linkedCourse!.id)
        .gte("booking_date", today)
        .order("booking_date", { ascending: true })
        .order("tee_time", { ascending: true });
      return data ?? [];
    },
    enabled: !!linkedCourse?.id,
  });

  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);
  const [assigningCaddyBookingId, setAssigningCaddyBookingId] = useState<string | null>(null);

  // Caddy staff for this venue club (for assignment dropdown)
  const { data: venueCaddyStaff } = useQuery({
    queryKey: ["venue-caddy-staff", clubId],
    queryFn: async () => {
      const { data } = await supabase
        .from("club_staff")
        .select("user_id, profiles:user_id(full_name)")
        .eq("club_id", clubId!)
        .eq("staff_role", "caddy")
        .eq("status", "active");
      return data ?? [];
    },
    enabled: !!clubId && isVenue,
  });

  const handleAssignCaddy = async (bookingId: string, caddyUserId: string, golferUserId: string) => {
    const { error } = await supabase
      .from("tee_time_bookings")
      .update({ caddy_id: caddyUserId || null })
      .eq("id", bookingId);
    if (error) { toast.error("Failed to assign caddy"); return; }
    if (caddyUserId) {
      const booking = courseBookings?.find((b: any) => b.id === bookingId);
      await supabase.from("notifications").insert({
        user_id: caddyUserId,
        title: "New Caddy Assignment 🏌️",
        message: `You have been assigned as caddy pada ${booking?.booking_date ? new Date(booking.booking_date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" }) : ""} pukul ${booking?.tee_time?.slice(0,5) ?? ""} di ${linkedCourse?.name ?? "lapangan"}.`,
        type: "caddy_assignment",
      });
    }
    toast.success(caddyUserId ? "Caddy assigned successfully" : "Caddy assignment removed");
    setAssigningCaddyBookingId(null);
    refetchCourseBookings();
  };

  const handleTeeTimeStatus = async (bookingId: string, newStatus: "confirmed" | "declined" | "ready", golferId: string) => {
    setUpdatingBookingId(bookingId);
    const { error } = await supabase
      .from("tee_time_bookings")
      .update({ status: newStatus })
      .eq("id", bookingId);
    if (error) { toast.error("Failed to update status"); setUpdatingBookingId(null); return; }

    const messages: Record<string, string> = {
      confirmed: `Your tee time booking di ${linkedCourse?.name ?? "lapangan"} has been confirmed.`,
      declined: `Maaf, booking tee time Anda di ${linkedCourse?.name ?? "lapangan"} could not be accepted.`,
      ready: `Course is ready! Enjoy your round di ${linkedCourse?.name ?? "lapangan"}.`,
    };
    await supabase.from("notifications").insert({
      user_id: golferId,
      title: newStatus === "confirmed" ? "Booking Confirmed ✓" : newStatus === "declined" ? "Booking Declined" : "Course Ready! ⛳",
      message: messages[newStatus],
      type: "booking_update",
    });

    const labels: Record<string, string> = { confirmed: "dikonfirmasi", declined: "ditolak", ready: "siap" };
    toast.success(`Booking ${labels[newStatus]}`);
    setUpdatingBookingId(null);
    refetchCourseBookings();
  };

  // Range bookings (for Driving Range schedule tab)
  const [rangeDate, setRangeDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [showRangeBookingForm, setShowRangeBookingForm] = useState(false);
  const [rangeForm, setRangeForm] = useState({ bay_id: "", start_time: "07:00", duration_hours: 1, notes: "", balls_bucket_count: 1 });
  const [savingRangeBooking, setSavingRangeBooking] = useState(false);

  const { data: rangeBays, refetch: refetchBays } = useQuery({
    queryKey: ["range-bays", clubId],
    queryFn: async () => {
      const { data } = await supabase
        .from("range_bays")
        .select("*")
        .eq("club_id", clubId!)
        .order("bay_number");
      return data ?? [];
    },
    enabled: !!clubId && isDrivingRange,
  });

  const { data: rangeBookings, refetch: refetchRangeBookings } = useQuery({
    queryKey: ["club-range-bookings", clubId, rangeDate],
    queryFn: async () => {
      const { data } = await supabase
        .from("range_bookings")
        .select("*, profiles:user_id(full_name), range_bays:bay_id(bay_number, bay_type)")
        .eq("club_id", clubId!)
        .eq("booking_date", rangeDate)
        .order("start_time");
      return data ?? [];
    },
    enabled: !!clubId && isDrivingRange,
  });

  const handleSaveRangeBooking = async () => {
    if (!rangeForm.bay_id || !rangeForm.start_time) return;
    setSavingRangeBooking(true);
    const [sh, sm] = rangeForm.start_time.split(":").map(Number);
    const endH = sh + rangeForm.duration_hours;
    const end_time = `${String(endH).padStart(2, "0")}:${String(sm).padStart(2, "0")}`;
    const bay = rangeBays?.find((b: any) => b.id === rangeForm.bay_id);
    const total_price = (bay?.price_per_hour ?? 0) * rangeForm.duration_hours;
    const { error } = await supabase.from("range_bookings").insert({
      club_id: clubId!,
      bay_id: rangeForm.bay_id,
      booking_date: rangeDate,
      start_time: rangeForm.start_time,
      end_time,
      duration_hours: rangeForm.duration_hours,
      balls_bucket_count: rangeForm.balls_bucket_count,
      total_price,
      notes: rangeForm.notes || null,
      status: "confirmed",
    });
    setSavingRangeBooking(false);
    if (error) { toast.error("Failed to save booking"); return; }
    toast.success("Booking saved successfully");
    setShowRangeBookingForm(false);
    setRangeForm({ bay_id: "", start_time: "07:00", duration_hours: 1, notes: "", balls_bucket_count: 1 });
    refetchRangeBookings();
  };

  const handleRangeBookingStatus = async (bookingId: string, status: "confirmed" | "cancelled") => {
    await supabase.from("range_bookings").update({ status }).eq("id", bookingId);
    toast.success(status === "confirmed" ? "Booking confirmed" : "Booking cancelled");
    refetchRangeBookings();
  };

  // Realtime subscription for new join requests
  useEffect(() => {
    if (!clubId || !userId) return;

    const channel = supabase
      .channel(`club-join-requests-${clubId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "club_invitations",
          filter: `club_id=eq.${clubId}`,
        },
        async (payload) => {
          const inv = payload.new as any;
          // Only handle self-initiated join requests (not admin invites)
          if (inv.invited_by !== inv.invited_user_id) return;
          // Don't notify about own actions
          if (inv.invited_user_id === userId) return;

          // Fetch requester name
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", inv.invited_user_id)
            .single();

          const playerName = profile?.full_name ?? "Seseorang";
          const clubName = club?.name ?? "klub Anda";

          // Invalidate queries immediately for badge update
          queryClient.invalidateQueries({ queryKey: ["club-join-requests", clubId] });
          queryClient.invalidateQueries({ queryKey: ["club-admin-pending", clubId] });

          // Show toast with Accept/Decline buttons
          toast(`${playerName} ingin bergabung ke ${clubName}`, {
            description: "Permintaan bergabung baru",
            duration: 10000,
            action: {
              label: "Terima",
              onClick: async () => {
                const { error } = await supabase
                  .from("members")
                  .insert({
                    club_id: clubId,
                    user_id: inv.invited_user_id,
                    role: "member",
                    joined_at: new Date().toISOString(),
                  });
                if (error && error.code !== "23505") {
                  toast.error(error.message);
                  return;
                }
                await supabase
                  .from("club_invitations")
                  .update({ status: "accepted" })
                  .eq("id", inv.id);
                toast.success("Member accepted!");
                queryClient.invalidateQueries({ queryKey: ["club-join-requests", clubId] });
                queryClient.invalidateQueries({ queryKey: ["club-admin-pending", clubId] });
                queryClient.invalidateQueries({ queryKey: ["club-admin-members", clubId] });
              },
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clubId, userId, club?.name, queryClient]);

  // Track which request is being processed
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  // KPI computations
  const memberCount = members?.length ?? 0;
  const staffCount = staff?.length ?? 0;
  const pendingStaffCount = pendingStaff?.length ?? 0;
  // joinRequests is a subset of pendingInvitations, so only use joinRequests
  const pendingCount = joinRequests?.length ?? 0;
  const totalTours = clubTours?.length ?? 0;
  const today = new Date().toISOString().split("T")[0];
  const todayBookings = courseBookings?.filter((b) => b.booking_date === today).length ?? 0;
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const weekBookings = courseBookings?.filter((b) => b.booking_date >= today && b.booking_date <= weekEnd).length ?? 0;
  const todayRangeBookings = rangeBookings?.length ?? 0;

  const isOwner = club?.owner_id === userId;
  const admins = members?.filter((m) => m.role === "admin") ?? [];
  const regularMembers = members?.filter((m) => m.role === "member") ?? [];

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

  const handleStaffRequest = async (staffId: string, action: "active" | "declined") => {
    const { error } = await supabase.from("club_staff").update({ status: action }).eq("id", staffId);
    if (error) { toast.error("Failed to update request"); return; }
    if (action === "active") toast.success("Staff request approved ✓");
    else toast.success("Staff request declined");
    refetchStaff();
    refetchPendingStaff();
  };

  const handleSaveSettings = async () => {
    if (!clubId) return;
    setSaving(true);
    const { error } = await supabase.from("clubs").update({
      name: editName, description: editDesc, contact_phone: editPhone, contact_email: editEmail,
    }).eq("id", clubId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Pengaturan klub diperbarui");
    queryClient.invalidateQueries({ queryKey: ["club-admin-info", clubId] });
  };

  const handleSaveSuccession = async () => {
    if (!clubId) return;
    const { error } = await supabase.from("clubs").update({ succession_user_id: successionUserId || null }).eq("id", clubId);
    if (error) { toast.error(error.message); return; }
    toast.success("Succession member diperbarui");
    queryClient.invalidateQueries({ queryKey: ["club-admin-info", clubId] });
  };

  const handleTransferOwnership = async () => {
    if (!clubId || !transferTargetId || !userId) return;
    const targetMember = members?.find((m) => m.user_id === transferTargetId && m.role === "admin");
    if (!targetMember) { toast.error("Target harus admin klub ini"); return; }
    const currentOwnerMember = members?.find((m) => m.user_id === userId && m.role === "owner");
    if (!currentOwnerMember) return;

    const { error: e1 } = await supabase.from("clubs").update({ owner_id: transferTargetId }).eq("id", clubId);
    if (e1) { toast.error(e1.message); return; }
    await supabase.from("members").delete().eq("id", targetMember.id);
    await supabase.from("members").insert({ club_id: clubId, user_id: transferTargetId, role: "owner" });
    await supabase.from("members").delete().eq("id", currentOwnerMember.id);
    await supabase.from("members").insert({ club_id: clubId, user_id: userId, role: "admin" });

    toast.success("Kepemilikan berhasil dipindahkan");
    queryClient.invalidateQueries({ queryKey: ["club-admin-info", clubId] });
    refetchMembers();
  };

  const handleArchiveClub = async () => {
    if (!clubId) return;
    const { error } = await supabase.from("clubs").update({ is_personal: true }).eq("id", clubId);
    if (error) { toast.error(error.message); return; }
    toast.success("Klub diarsipkan");
    navigate("/clubs");
  };

  const handleCreateAnnouncement = async () => {
    if (!clubId || !userId || !annTitle.trim() || !annContent.trim()) return;
    const { error } = await supabase.from("club_announcements").insert({
      club_id: clubId,
      author_id: userId,
      title: annTitle.trim(),
      content: annContent.trim(),
      is_pinned: annPinned,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Pengumuman dipublikasikan");
    setShowCreateAnnouncement(false);
    setAnnTitle("");
    setAnnContent("");
    setAnnPinned(false);
    refetchAnnouncements();
  };

  const handleDeleteAnnouncement = async (annId: string) => {
    const { error } = await supabase.from("club_announcements").delete().eq("id", annId);
    if (error) { toast.error(error.message); return; }
    toast.success("Pengumuman dihapus");
    refetchAnnouncements();
  };

  const toggleTour = (tourId: string) => {
    setExpandedTours((prev) => {
      const next = new Set(prev);
      if (next.has(tourId)) next.delete(tourId); else next.add(tourId);
      return next;
    });
  };

  const roleColors: Record<string, string> = {
    owner: "bg-destructive/10 text-destructive border-destructive/30",
    admin: "bg-accent/10 text-accent border-accent/30",
    member: "bg-muted text-muted-foreground",
  };

  if (!clubId) return (
    <div className="bottom-nav-safe p-4 text-center text-muted-foreground">
      <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
      <p>Tidak ada klub dipilih</p>
    </div>
  );

  const getProfileName = (uid: string) => {
    const m = members?.find((m) => m.user_id === uid);
    return m?.profiles?.full_name || "Unknown";
  };

  // ── Render helpers ──


  const filteredMembers = members?.filter((m: any) =>
    (m.profiles?.full_name ?? "").toLowerCase().includes(memberSearch.toLowerCase())
  ) ?? [];

  const displayMembers = filteredMembers.slice().sort((a: any, b: any) => {
    if (sortBy === "name") {
      return (a.profiles?.full_name ?? "").toLowerCase()
        .localeCompare((b.profiles?.full_name ?? "").toLowerCase(), "id");
    }
    const roleOrder: Record<string, number> = { owner: 0, admin: 1, member: 2 };
    const roleA = roleOrder[a.role] ?? 3;
    const roleB = roleOrder[b.role] ?? 3;
    if (roleA !== roleB) return roleA - roleB;
    return (a.profiles?.full_name ?? "").toLowerCase()
      .localeCompare((b.profiles?.full_name ?? "").toLowerCase(), "id");
  });

  const renderMembersTab = () => (
    <TabsContent value="members" className="space-y-2 pt-2">
      {/* Pending Join Requests */}
      {joinRequests && joinRequests.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent mb-2">
            ⏳ Pending Requests ({joinRequests.length})
          </p>
          {joinRequests.map((req: any) => (
            <div key={req.id} className="golf-card flex items-center gap-3 p-3 mb-2 border-accent/30">
              <Avatar className="h-9 w-9">
                <AvatarImage src={req.profiles?.avatar_url ?? ""} />
                <AvatarFallback className="bg-accent/20 text-accent text-xs">
                  {(req.profiles?.full_name ?? "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {req.profiles?.full_name ?? "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground">
                  HCP {req.profiles?.handicap ?? "N/A"} · Minta bergabung
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button size="sm" className="h-7 px-2 text-xs gap-1"
                  disabled={processingRequestId === req.id}
                  onClick={async () => {
                    setProcessingRequestId(req.id);
                    try {
                      const { error } = await supabase
                        .from("members")
                        .insert({
                          club_id: clubId,
                          user_id: req.invited_user_id,
                          role: "member",
                          joined_at: new Date().toISOString()
                        });
                      if (error && error.code !== "23505") {
                        toast.error(error.message);
                        return;
                      }
                      await supabase
                        .from("club_invitations")
                        .update({ status: "accepted" })
                        .eq("id", req.id);
                      toast.success("Member accepted!");
                      await Promise.all([
                        queryClient.invalidateQueries({ queryKey: ["club-join-requests", clubId] }),
                        queryClient.invalidateQueries({ queryKey: ["club-admin-members", clubId] }),
                        queryClient.invalidateQueries({ queryKey: ["club-admin-pending", clubId] }),
                      ]);
                    } catch (err: any) {
                      toast.error(err.message);
                    } finally {
                      setProcessingRequestId(null);
                    }
                  }}>
                  {processingRequestId === req.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )} Terima
                </Button>
                <Button size="sm" variant="outline"
                  className="h-7 px-2 text-xs gap-1 text-destructive border-destructive/30"
                  disabled={processingRequestId === req.id}
                  onClick={async () => {
                    setProcessingRequestId(req.id);
                    try {
                      await supabase
                        .from("club_invitations")
                        .update({ status: "declined" })
                        .eq("id", req.id);
                      toast.success("Request ditolak");
                      await Promise.all([
                        queryClient.invalidateQueries({ queryKey: ["club-join-requests", clubId] }),
                        queryClient.invalidateQueries({ queryKey: ["club-admin-pending", clubId] }),
                      ]);
                    } catch (err: any) {
                      toast.error(err.message);
                    } finally {
                      setProcessingRequestId(null);
                    }
                  }}>
                  <X className="h-3 w-3" /> Tolak
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Button size="sm" variant="outline" className="w-full gap-1 text-xs mb-2" onClick={() => setShowInvite(true)}>
        <Plus className="h-3.5 w-3.5" /> Invite Member
      </Button>
      <Input
        placeholder="Search members..."
        value={memberSearch}
        onChange={e => setMemberSearch(e.target.value)}
        className="h-8 text-xs"
      />
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] text-muted-foreground">
          {memberSearch
            ? `${filteredMembers.length} dari ${members?.length ?? 0} member`
            : `${members?.length ?? 0} member`}
        </p>
        <div className="flex gap-1">
          <button
            onClick={() => setSortBy("role")}
            className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
              sortBy === "role"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            By Role
          </button>
          <button
            onClick={() => setSortBy("name")}
            className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
              sortBy === "name"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            A-Z
          </button>
        </div>
      </div>
      {displayMembers.map((m: any) => (
        <div key={m.id} className="golf-card flex items-center gap-3 p-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={m.profiles?.avatar_url ?? ""} />
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
              {(m.profiles?.full_name ?? "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{m.profiles?.full_name || "Unknown"}</p>
            <div className="flex items-center gap-1 flex-wrap">
              <Badge variant="outline" className={`text-[9px] ${roleColors[m.role] ?? ""}`}>{m.role}</Badge>
              {staffRoles?.[m.user_id] && (
                <Badge variant="secondary" className="text-[9px]">
                  {staffRoles[m.user_id]}
                </Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><ChevronRight className="h-4 w-4" /></Button>
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
      {displayMembers.length === 0 && memberSearch && (
        <p className="text-xs text-muted-foreground text-center py-4">Not found</p>
      )}
    </TabsContent>
  );

  const renderStaffTab = () => (
    <TabsContent value="staff" className="space-y-2 pt-2">

      {/* Pending requests */}
      {(pendingStaff?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-amber-500/30 overflow-hidden mb-2">
          <div className="px-3 py-2 bg-amber-500/10">
            <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">
              ⏳ Staff Requests ({pendingStaff!.length})
            </p>
          </div>
          {pendingStaff!.map((s: any) => (
            <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 border-t border-amber-500/20 bg-amber-500/5">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={s.profiles?.avatar_url ?? ""} />
                <AvatarFallback className="bg-amber-500/20 text-amber-600 text-xs font-bold">
                  {(s.profiles?.full_name ?? "S").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{s.profiles?.full_name || "Unknown"}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  Melamar sebagai <span className="font-semibold text-amber-500">{s.staff_role}</span>
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => handleStaffRequest(s.id, "active")}
                  className="h-8 w-8 flex items-center justify-center rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-500 transition-colors"
                  title="Approve"
                >
                  <UserCheck className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleStaffRequest(s.id, "declined")}
                  className="h-8 w-8 flex items-center justify-center rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
                  title="Decline"
                >
                  <UserX className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active staff */}
      {staff?.length === 0 && (pendingStaff?.length ?? 0) === 0 && (
        <div className="golf-card p-6 text-center text-sm text-muted-foreground">No staff yet</div>
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
            <p className="text-xs text-muted-foreground capitalize">{s.staff_role}</p>
          </div>
          <button
            onClick={() => handleStaffRequest(s.id, "declined")}
            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title="Remove staff"
          >
            <UserX className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </TabsContent>
  );

  const renderTournamentsTab = () => (
    <TabsContent value="tournaments" className="space-y-2 pt-2">
      <Button size="sm" variant="outline" className="w-full gap-1 text-xs mb-2" onClick={() => setShowCreateTour(true)}>
        <Plus className="h-3.5 w-3.5" /> Create Tournament
      </Button>
      {!clubTours && (
        <div className="golf-card p-4 text-center text-xs text-muted-foreground">Memuat tournament...</div>
      )}
      {clubTours?.length === 0 && (
        <div className="golf-card p-6 text-center text-sm text-muted-foreground">No tournaments yet. Buat tournament pertama.</div>
      )}
      {clubTours?.map((tour: any) => {
        const events = tour.events ?? [];
        const totalPlayers = events.reduce((sum: number, e: any) => sum + (e.contestants?.length ?? 0), 0);
        const isExpanded = expandedTours.has(tour.id);

        return (
          <Collapsible key={tour.id} open={isExpanded} onOpenChange={() => toggleTour(tour.id)}>
            <div className="golf-card overflow-hidden">
              <div className="w-full flex items-center gap-3 p-3">
                <button
                  className="min-w-0 flex-1 text-left hover:opacity-70 transition-opacity"
                  onClick={() => navigate(`/tour/${tour.id}`)}
                >
                  <p className="text-sm font-semibold truncate">{tour.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-[9px]">{tour.tournament_type}</Badge>
                    <Badge variant="secondary" className="text-[9px]">{tour.year}</Badge>
                    {tour.clubRole === "organizer" ? (
                      <Badge variant="outline" className="text-[9px] text-primary border-primary/30">Organizer</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] text-accent border-accent/30">Participant</Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">{events.length} events · {totalPlayers} players</span>
                  </div>
                </button>
                <CollapsibleTrigger asChild>
                  <button className="rounded-full p-1 hover:bg-muted transition-colors shrink-0">
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="border-t border-border">
                  {events.length === 0 && (
                    <p className="p-3 text-xs text-muted-foreground text-center">No events in this tour</p>
                  )}
                  {events.map((e: any) => (
                    <div key={e.id} className="flex items-center gap-2 px-3 py-2.5 border-b border-border last:border-b-0">
                      <button
                        onClick={() => navigate(`/event/${e.id}`)}
                        className="min-w-0 flex-1 text-left hover:opacity-70 transition-opacity"
                      >
                        <p className="text-xs font-medium truncate">{e.name}</p>
                        <p className="text-[10px] text-muted-foreground">{e.event_date}</p>
                      </button>
                      <Badge variant="outline" className="text-[9px] shrink-0">{e.status}</Badge>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5 shrink-0" onClick={() => setRolesEventId(e.id)}>
                        <Shield className="h-3 w-3" />
                      </Button>
                      <button onClick={() => navigate(`/event/${e.id}`)} className="shrink-0">
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
                {/* Players from this club in this tournament */}
                {(() => {
                  const tourPlayers = clubTourPlayers?.filter(
                    (p: any) => (p.tours as any)?.id === tour.id
                  ) ?? [];
                  if (tourPlayers.length === 0) return null;
                  return (
                    <div className="border-t border-border px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        My Players ({tourPlayers.length})
                      </p>
                      {tourPlayers.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between py-1.5 text-xs border-b border-border/50 last:border-0">
                          <span className="truncate flex-1">
                            {(p.profiles as any)?.full_name ?? "Unknown"}
                            <span className="text-muted-foreground ml-1">
                              HCP {(p.profiles as any)?.handicap ?? "—"}
                            </span>
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[9px] ml-2 shrink-0 ${
                              p.status === "registered" || p.status === "active"
                                ? "text-primary border-primary/30"
                                : p.status === "pending"
                                ? "text-accent border-accent/30"
                                : "text-muted-foreground"
                            }`}
                          >
                            {p.status === "registered" || p.status === "active" ? "✓ registered" : p.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                {tour.clubRole === "organizer" && (
                  <div className="px-3 pb-3 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-1 text-xs h-7"
                      onClick={() => navigate(`/tour/${tour.id}`)}
                    >
                      <Plus className="h-3 w-3" /> Add Event to this Tour
                    </Button>
                  </div>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </TabsContent>
  );

  const renderVenueTab = () => (
    <TabsContent value="venue" className="space-y-3 pt-2">
      {linkedCourse && (
        <Card>
          <CardContent className="p-3 flex gap-3">
            <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
              {linkedCourse.image_url ? (
                <img src={linkedCourse.image_url} alt={linkedCourse.name} className="h-full w-full object-cover" />
              ) : (
                <MapPin className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{linkedCourse.name}</p>
              <p className="text-xs text-muted-foreground">
                Par {linkedCourse.par ?? "–"} · {linkedCourse.holes_count} holes
                {linkedCourse.green_fee_price ? ` · Rp ${Number(linkedCourse.green_fee_price).toLocaleString("id-ID")}` : ""}
              </p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => navigate(`/venue/${linkedCourse.id}`)}>
                  View Course
                </Button>
                <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => navigate(`/venue/${linkedCourse.id}/book`)}>
                  Manage Tee Times
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="golf-card p-3 space-y-0.5">
          <Calendar className="h-4 w-4 text-primary" />
          <p className="text-xl font-bold">{todayBookings}</p>
          <p className="text-[10px] text-muted-foreground">Bookings Today</p>
        </div>
        <div className="golf-card p-3 space-y-0.5">
          <Calendar className="h-4 w-4 text-accent" />
          <p className="text-xl font-bold">{weekBookings}</p>
          <p className="text-[10px] text-muted-foreground">This Week</p>
        </div>
      </div>
    </TabsContent>
  );

  const renderVenueScheduleTab = () => {
    const statusColor: Record<string, string> = {
      pending:   "bg-amber-500/10 text-amber-500",
      confirmed: "bg-green-500/10 text-green-500",
      ready:     "bg-primary/10 text-primary",
      declined:  "bg-red-400/10 text-red-400",
      cancelled: "bg-muted text-muted-foreground",
    };
    const statusLabel: Record<string, string> = {
      pending: "Pending", confirmed: "Confirmed", ready: "Ready", declined: "Declined", cancelled: "Cancelled",
    };
    const pendingBookings = courseBookings?.filter((b: any) => b.status === "pending") ?? [];
    const otherBookings   = courseBookings?.filter((b: any) => b.status !== "pending") ?? [];

    const formatRupiah = (n: number | null) =>
      n ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n) : "-";

    const renderCard = (b: any) => {
      const golfer = (b.profiles as any);
      const isUpdating = updatingBookingId === b.id;
      return (
        <div key={b.id} className="golf-card p-3 space-y-2">
          <div className="flex items-start gap-3">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={golfer?.avatar_url ?? ""} />
              <AvatarFallback className="text-xs">{golfer?.full_name?.[0] ?? "G"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{golfer?.full_name ?? "Golfer"}</p>
              <p className="text-[11px] text-muted-foreground">
                {new Date(b.booking_date).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}
                {" · "}{b.tee_time?.slice(0, 5)} · {b.players_count} players
              </p>
              {b.total_price && <p className="text-[11px] text-primary font-medium">{formatRupiah(b.total_price)}</p>}
              {b.notes && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{b.notes}</p>}
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusColor[b.status] ?? "bg-muted text-muted-foreground"}`}>
              {statusLabel[b.status] ?? b.status}
            </span>
          </div>
          {b.status === "pending" && (
            flags.venue_schedule_admin ? (
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline"
                  className="flex-1 h-8 text-xs border-red-400/40 text-red-400 hover:bg-red-400/10"
                  disabled={isUpdating}
                  onClick={() => handleTeeTimeStatus(b.id, "declined", b.user_id)}>
                  {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <><X className="h-3 w-3 mr-1" />Reject</>}
                </Button>
                <Button size="sm"
                  className="flex-1 h-8 text-xs"
                  disabled={isUpdating}
                  onClick={() => handleTeeTimeStatus(b.id, "confirmed", b.user_id)}>
                  {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="h-3 w-3 mr-1" />Confirm</>}
                </Button>
              </div>
            ) : (
              <div className="pt-1 bg-muted/40 rounded-lg px-3 py-2 text-center">
                <p className="text-[10px] text-muted-foreground">Fitur konfirmasi booking belum aktif</p>
              </div>
            )
          )}
          {b.status === "confirmed" && (
            <div className="space-y-2 pt-1">
              {/* Caddy assignment */}
              {assigningCaddyBookingId === b.id ? (
                <div className="flex gap-2">
                  <select
                    className="flex-1 h-8 text-xs rounded-lg border border-border bg-background px-2"
                    defaultValue={b.caddy_id ?? ""}
                    onChange={(e) => handleAssignCaddy(b.id, e.target.value, b.user_id)}
                  >
                    <option value="">— Tanpa caddy —</option>
                    {venueCaddyStaff?.map((cs: any) => (
                      <option key={cs.user_id} value={cs.user_id}>
                        {(cs.profiles as any)?.full_name ?? cs.user_id}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-xs"
                    onClick={() => setAssigningCaddyBookingId(null)}>Cancel</Button>
                </div>
              ) : (
                <button
                  className="w-full text-left text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setAssigningCaddyBookingId(b.id)}
                >
                  🎒 {b.caddy_id
                    ? `Caddy: ${venueCaddyStaff?.find((cs: any) => cs.user_id === b.caddy_id) ? (venueCaddyStaff.find((cs: any) => cs.user_id === b.caddy_id)?.profiles as any)?.full_name : "Assigned"} · Ganti`
                    : "Assign caddy →"}
                </button>
              )}
              {flags.venue_schedule_admin ? (
                <Button size="sm" className="w-full h-8 text-xs bg-primary/10 text-primary hover:bg-primary/20"
                  disabled={isUpdating}
                  onClick={() => handleTeeTimeStatus(b.id, "ready", b.user_id)}>
                  {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : "⛳ Set Course Ready"}
                </Button>
              ) : (
                <Button size="sm" className="w-full h-8 text-xs" variant="outline" disabled>
                  ⛳ Set Course Ready
                </Button>
              )}
            </div>
          )}
        </div>
      );
    };

    return (
      <TabsContent value="schedule" className="space-y-3 pt-2">
        <div className="grid grid-cols-3 gap-2">
          <div className="golf-card p-3 space-y-0.5">
            <Clock className="h-4 w-4 text-amber-500" />
            <p className="text-xl font-bold">{pendingBookings.length}</p>
            <p className="text-[10px] text-muted-foreground">Pending</p>
          </div>
          <div className="golf-card p-3 space-y-0.5">
            <Check className="h-4 w-4 text-primary" />
            <p className="text-xl font-bold">{todayBookings}</p>
            <p className="text-[10px] text-muted-foreground">Today</p>
          </div>
          <div className="golf-card p-3 space-y-0.5">
            <Calendar className="h-4 w-4 text-green-500" />
            <p className="text-xl font-bold">{weekBookings}</p>
            <p className="text-[10px] text-muted-foreground">This Week</p>
          </div>
        </div>

        {pendingBookings.length > 0 && (
          <>
            <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider">
              ● {pendingBookings.length} Booking Menunggu Confirm
            </p>
            {pendingBookings.map(renderCard)}
          </>
        )}

        {otherBookings.length > 0 && (
          <>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-2">Booking Lainnya</p>
            {otherBookings.map(renderCard)}
          </>
        )}

        {(courseBookings?.length ?? 0) === 0 && (
          <div className="golf-card p-8 text-center text-sm text-muted-foreground">
            <Calendar className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
            <p>No tee time bookings</p>
          </div>
        )}
      </TabsContent>
    );
  };

  const renderScheduleTab = () => {
    const formatRupiah = (n: number) =>
      new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
    const totalHours = rangeBookings?.reduce((s: number, b: any) => s + (b.duration_hours ?? 1), 0) ?? 0;
    const totalRevenue = rangeBookings?.reduce((s: number, b: any) => s + (b.total_price ?? 0), 0) ?? 0;
    const statusColor: Record<string, string> = {
      confirmed: "bg-green-500/10 text-green-500",
      pending: "bg-amber-500/10 text-amber-500",
      cancelled: "bg-muted text-muted-foreground",
    };

    return (
      <TabsContent value="schedule" className="space-y-3 pt-2">
        {/* Date picker */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={rangeDate}
            onChange={(e) => setRangeDate(e.target.value)}
            className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <Button size="sm" className="h-9 gap-1 shrink-0" onClick={() => setShowRangeBookingForm(true)}>
            <Plus className="h-3.5 w-3.5" />Booking
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2">
          <div className="golf-card p-3 space-y-0.5">
            <Clock className="h-4 w-4 text-primary" />
            <p className="text-xl font-bold">{todayRangeBookings}</p>
            <p className="text-[10px] text-muted-foreground">Booking</p>
          </div>
          <div className="golf-card p-3 space-y-0.5">
            <Users className="h-4 w-4 text-amber-500" />
            <p className="text-xl font-bold">{totalHours}j</p>
            <p className="text-[10px] text-muted-foreground">Total Jam</p>
          </div>
          <div className="golf-card p-3 space-y-0.5">
            <DollarSign className="h-4 w-4 text-green-500" />
            <p className="text-xl font-bold">{totalRevenue > 0 ? formatRupiah(totalRevenue).replace("Rp\u00a0","").replace(".000","k") : "–"}</p>
            <p className="text-[10px] text-muted-foreground">Pendapatan</p>
          </div>
        </div>

        {/* Bays overview */}
        {(rangeBays?.length ?? 0) > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Bay Active</p>
            <div className="flex gap-2 flex-wrap">
              {rangeBays?.filter((b: any) => b.is_active).map((bay: any) => {
                const isBooked = rangeBookings?.some((bk: any) =>
                  bk.bay_id === bay.id && bk.status === "confirmed"
                );
                return (
                  <div key={bay.id} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    isBooked ? "bg-red-500/10 border-red-500/30 text-red-500" : "bg-green-500/10 border-green-500/30 text-green-500"
                  }`}>
                    Bay {bay.bay_number} {isBooked ? "• Terisi" : "• Kosong"}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Booking list */}
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Booking {new Date(rangeDate).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" })}
        </p>
        {todayRangeBookings === 0 && (
          <div className="golf-card p-8 text-center text-sm text-muted-foreground">
            <Clock className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
            <p>No bookings</p>
          </div>
        )}
        {rangeBookings?.map((b: any) => (
          <div key={b.id} className="golf-card p-3 space-y-2">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0 text-sm font-bold text-primary">
                {(b.range_bays as any)?.bay_number ?? "–"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{(b.profiles as any)?.full_name || "Walk-in"}</p>
                <p className="text-[11px] text-muted-foreground">
                  {b.start_time?.slice(0,5)} – {b.end_time?.slice(0,5)} · {b.duration_hours}j
                  {b.balls_bucket_count ? ` · ${b.balls_bucket_count} bucket bola` : ""}
                </p>
                {b.total_price > 0 && (
                  <p className="text-[11px] text-primary font-medium">{formatRupiah(b.total_price)}</p>
                )}
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusColor[b.status] ?? "bg-muted text-muted-foreground"}`}>
                {b.status === "confirmed" ? "Active" : b.status === "pending" ? "Pending" : "Cancel"}
              </span>
            </div>
            {b.status === "pending" && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline"
                  className="flex-1 h-7 text-xs text-red-400 border-red-400/30 hover:bg-red-400/10"
                  onClick={() => handleRangeBookingStatus(b.id, "cancelled")}>
                  Batalkan
                </Button>
                <Button size="sm" className="flex-1 h-7 text-xs"
                  onClick={() => handleRangeBookingStatus(b.id, "confirmed")}>
                  Confirm
                </Button>
              </div>
            )}
            {b.notes && <p className="text-[10px] text-muted-foreground italic">{b.notes}</p>}
          </div>
        ))}

        {/* Quick booking form */}
        {showRangeBookingForm && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowRangeBookingForm(false)}>
            <div className="bg-card border border-border rounded-t-2xl w-full max-w-lg p-5 space-y-3"
              onClick={(e) => e.stopPropagation()}>
              <p className="text-sm font-semibold">Add Booking</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Bay</label>
                  <select
                    className="w-full mt-1 h-9 rounded-lg border border-border bg-background px-2 text-sm"
                    value={rangeForm.bay_id}
                    onChange={(e) => setRangeForm(f => ({ ...f, bay_id: e.target.value }))}
                  >
                    <option value="">Select bay</option>
                    {rangeBays?.filter((b: any) => b.is_active).map((bay: any) => (
                      <option key={bay.id} value={bay.id}>
                        Bay {bay.bay_number} {bay.bay_type ? `(${bay.bay_type})` : ""} · {formatRupiah(bay.price_per_hour ?? 0)}/jam
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Mulai</label>
                  <input
                    type="time"
                    value={rangeForm.start_time}
                    onChange={(e) => setRangeForm(f => ({ ...f, start_time: e.target.value }))}
                    className="w-full mt-1 h-9 rounded-lg border border-border bg-background px-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Durasi (jam)</label>
                  <select
                    className="w-full mt-1 h-9 rounded-lg border border-border bg-background px-2 text-sm"
                    value={rangeForm.duration_hours}
                    onChange={(e) => setRangeForm(f => ({ ...f, duration_hours: Number(e.target.value) }))}
                  >
                    {[1,2,3,4].map(h => <option key={h} value={h}>{h} jam</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Bucket bola</label>
                  <select
                    className="w-full mt-1 h-9 rounded-lg border border-border bg-background px-2 text-sm"
                    value={rangeForm.balls_bucket_count}
                    onChange={(e) => setRangeForm(f => ({ ...f, balls_bucket_count: Number(e.target.value) }))}
                  >
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} bucket</option>)}
                  </select>
                </div>
              </div>
              <Input
                placeholder="Notes (opsional)"
                value={rangeForm.notes}
                onChange={(e) => setRangeForm(f => ({ ...f, notes: e.target.value }))}
                className="h-9 text-sm"
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowRangeBookingForm(false)}>Cancel</Button>
                <Button className="flex-1" disabled={!rangeForm.bay_id || savingRangeBooking} onClick={handleSaveRangeBooking}>
                  {savingRangeBooking ? "Saving..." : "Save Booking"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </TabsContent>
    );
  };

  const renderAnnouncementsTab = () => {
    const pinnedAnnouncements = announcements?.filter((a: any) => a.is_pinned) ?? [];
    const regularAnnouncements = announcements?.filter((a: any) => !a.is_pinned) ?? [];
    const isAdminOrOwner = isOwner || admins.some((a) => a.user_id === userId);

    const timeAgo = (date: string) => {
      const diff = Date.now() - new Date(date).getTime();
      const days = Math.floor(diff / 86400000);
      if (days === 0) return "Today";
      if (days === 1) return "Yesterday";
      return `${days} days ago`;
    };

    const renderAnnCard = (ann: any) => (
      <div key={ann.id} className="golf-card p-3">
        <div className="flex items-start gap-2">
          {ann.is_pinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{ann.title}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{ann.content}</p>
            <p className="text-[10px] text-muted-foreground mt-2">
              {(ann.profiles as any)?.full_name ?? "Admin"} · {timeAgo(ann.created_at)}
            </p>
          </div>
          {ann.author_id === userId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleDeleteAnnouncement(ann.id)} className="text-destructive">
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    );

    return (
      <TabsContent value="announcements" className="space-y-2 pt-2">
        {isAdminOrOwner && (
          <Button size="sm" variant="outline" className="w-full gap-1 text-xs mb-2" onClick={() => setShowCreateAnnouncement(true)}>
            <Plus className="h-3.5 w-3.5" /> New Announcement
          </Button>
        )}
        {announcements?.length === 0 && (
          <div className="golf-card p-6 text-center text-sm text-muted-foreground">
            <Megaphone className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
            <p>No announcements yet</p>
          </div>
        )}
        {pinnedAnnouncements.length > 0 && (
          <>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">📌 Pinned</p>
            {pinnedAnnouncements.map(renderAnnCard)}
          </>
        )}
        {regularAnnouncements.length > 0 && (
          <>
            {pinnedAnnouncements.length > 0 && (
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-2">All Announcements</p>
            )}
            {regularAnnouncements.map(renderAnnCard)}
          </>
        )}
      </TabsContent>
    );
  };

  const renderSettingsTab = () => (
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
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="mt-1" rows={3} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Contact Phone</Label>
            <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Contact Email</Label>
            <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="mt-1" />
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
              <p className="text-xs text-muted-foreground">No admins yet.</p>
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
                      <SelectItem key={m.id} value={m.id}>{m.profiles?.full_name || "Member"}</SelectItem>
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
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Succession Member</Label>
              <p className="text-[11px] text-muted-foreground mb-2">
                If you're inactive for 180 days, this person will automatically become owner.
              </p>
              <Select value={successionUserId} onValueChange={setSuccessionUserId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pilih admin" /></SelectTrigger>
                <SelectContent>
                  {admins.map((a: any) => (
                    <SelectItem key={a.user_id} value={a.user_id}>{a.profiles?.full_name || "Admin"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="w-full mt-2 text-xs" onClick={handleSaveSuccession}>Save Succession</Button>
            </div>
            <div className="border-t border-border pt-4">
              <Label className="text-xs text-muted-foreground mb-1 block">Transfer Ownership</Label>
              <p className="text-[11px] text-muted-foreground mb-2">
                Transfer full ownership to an admin. You will become an Admin. This cannot be undone.
              </p>
              <Select value={transferTargetId} onValueChange={setTransferTargetId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pilih admin tujuan" /></SelectTrigger>
                <SelectContent>
                  {admins.map((a: any) => (
                    <SelectItem key={a.user_id} value={a.user_id}>{a.profiles?.full_name || "Admin"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="w-full mt-2 text-xs" disabled={!transferTargetId}>Transfer Ownership</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Transfer Ownership</AlertDialogTitle>
                    <AlertDialogDescription>
                      Anda akan menyerahkan kepemilikan klub kepada <strong>{getProfileName(transferTargetId)}</strong>. Anda akan menjadi Admin biasa. Tindakan ini tidak dapat dibatalkan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
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
                <Button variant="outline" size="sm" className="w-full text-xs text-destructive border-destructive/30 hover:bg-destructive/10">Archive Club</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive Club</AlertDialogTitle>
                  <AlertDialogDescription>
                    Club akan diarsipkan dan tidak bisa menerima member baru. Data tetap tersimpan. Lanjutkan?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleArchiveClub} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Ya, Archive</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </TabsContent>
  );

  // ── KPI Cards per type ──
  const renderKPIs = () => {
    if (isGolfCourse) {
      return (
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
            <p className="text-xl font-bold">{todayBookings}</p>
            <p className="text-[10px] text-muted-foreground">Bookings Today</p>
          </div>
          <div className="golf-card p-3 space-y-0.5">
            <Bell className="h-4 w-4 text-accent" />
            <p className="text-xl font-bold">{pendingCount}</p>
            <p className="text-[10px] text-muted-foreground">Pending</p>
          </div>
        </div>
      );
    }
    if (isDrivingRange) {
      return (
        <div className="grid grid-cols-2 gap-3 px-4 pb-3">
          <div className="golf-card p-3 space-y-0.5">
            <Users className="h-4 w-4 text-primary" />
            <p className="text-xl font-bold">{memberCount}</p>
            <p className="text-[10px] text-muted-foreground">Members</p>
          </div>
          <div className="golf-card p-3 space-y-0.5">
            <Clock className="h-4 w-4 text-accent" />
            <p className="text-xl font-bold">{todayRangeBookings}</p>
            <p className="text-[10px] text-muted-foreground">Bookings Today</p>
          </div>
          <div className="golf-card p-3 space-y-0.5">
            <DollarSign className="h-4 w-4 text-primary" />
            <p className="text-xl font-bold">–</p>
            <p className="text-[10px] text-muted-foreground">Monthly Revenue</p>
          </div>
          <div className="golf-card p-3 space-y-0.5">
            <Bell className="h-4 w-4 text-accent" />
            <p className="text-xl font-bold">{pendingCount}</p>
            <p className="text-[10px] text-muted-foreground">Pending</p>
          </div>
        </div>
      );
    }
    // Community
    return (
      <div className="grid grid-cols-2 gap-3 px-4 pb-3">
        <div className="golf-card p-3 space-y-0.5">
          <Users className="h-4 w-4 text-primary" />
          <p className="text-xl font-bold">{memberCount}</p>
          <p className="text-[10px] text-muted-foreground">Members</p>
        </div>
        <div className="golf-card p-3 space-y-0.5">
          <Trophy className="h-4 w-4 text-accent" />
          <p className="text-xl font-bold">{totalTours}</p>
          <p className="text-[10px] text-muted-foreground">Tournaments</p>
        </div>
        <div className="golf-card p-3 space-y-0.5">
          <Megaphone className="h-4 w-4 text-primary" />
          <p className="text-xl font-bold">–</p>
          <p className="text-[10px] text-muted-foreground">Announcements</p>
        </div>
        <div className="golf-card p-3 space-y-0.5">
          <Bell className="h-4 w-4 text-accent" />
          <p className="text-xl font-bold">{pendingCount}</p>
          <p className="text-[10px] text-muted-foreground">Pending</p>
        </div>
      </div>
    );
  };

  // ── Tab structure per type ──
  const renderTabs = () => {
    if (isVenue) {
      return (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="staff" className="flex-1 text-xs">
              Staff{pendingStaffCount > 0 && <span className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full bg-amber-500 text-white text-[10px] font-bold">{pendingStaffCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex-1 text-xs">Schedule</TabsTrigger>
            <TabsTrigger value="venue" className="flex-1 text-xs">Course</TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 text-xs">Settings</TabsTrigger>
          </TabsList>
          {renderStaffTab()}
          {renderVenueScheduleTab()}
          {renderVenueTab()}
          {renderSettingsTab()}
        </Tabs>
      );
    }
    if (isDrivingRange) {
      return (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="members" className="flex-1 text-xs">Members</TabsTrigger>
            <TabsTrigger value="staff" className="flex-1 text-xs">Staff{pendingStaffCount > 0 && <span className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full bg-amber-500 text-white text-[10px] font-bold">{pendingStaffCount}</span>}</TabsTrigger>
            <TabsTrigger value="schedule" className="flex-1 text-xs">Schedule</TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 text-xs">Settings</TabsTrigger>
          </TabsList>
          {renderMembersTab()}
          {renderStaffTab()}
          {renderScheduleTab()}
          {renderSettingsTab()}
        </Tabs>
      );
    }
    // Community
    return (
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="members" className="flex-1 text-xs">Members</TabsTrigger>
          <TabsTrigger value="tournaments" className="flex-1 text-xs">Tournaments</TabsTrigger>
          <TabsTrigger value="announcements" className="flex-1 text-xs">Announcements</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1 text-xs">Settings</TabsTrigger>
        </TabsList>
        {renderMembersTab()}
        {renderTournamentsTab()}
        {renderAnnouncementsTab()}
        {renderSettingsTab()}
      </Tabs>
    );
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
        {isVenue && <Badge variant="outline" className="text-[9px] shrink-0">Golf Venue</Badge>}
        {isDrivingRange && <Badge variant="outline" className="text-[9px] shrink-0">Driving Range</Badge>}
        {isCommunity && <Badge variant="outline" className="text-[9px] shrink-0">Community</Badge>}
      </div>

      {/* Club selector */}
      {myAdminClubs && myAdminClubs.length > 1 && (
        <div className="px-4 pb-3">
          <Select value={selectedClubId} onValueChange={(v) => { setSelectedClubId(v); navigate(`/admin/club/${v}`, { replace: true }); }}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pilih klub" /></SelectTrigger>
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
      <div className="flex items-center gap-2 px-3 py-2 mx-4 mb-2 rounded-xl border bg-amber-500/15 border-amber-500/40 text-amber-400">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
        </span>
        <span className="font-bold text-[11px] uppercase tracking-wider shrink-0">Club Admin</span>
        <span className="opacity-40 text-xs">›</span>
        <span className="text-[11px] font-medium opacity-80 truncate">{club?.name ?? ""}</span>
      </div>
      {/* KPI Cards */}
      {renderKPIs()}

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
        {renderTabs()}
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

      {/* Create Announcement Dialog */}
      <Dialog open={showCreateAnnouncement} onOpenChange={setShowCreateAnnouncement}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">New Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Title</Label>
              <Input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} className="mt-1" placeholder="Announcement title" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Content</Label>
              <Textarea value={annContent} onChange={(e) => setAnnContent(e.target.value)} className="mt-1" rows={4} placeholder="Write your announcement..." />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={annPinned} onCheckedChange={setAnnPinned} />
              <Label className="text-xs">📌 Pin to top</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateAnnouncement} disabled={!annTitle.trim() || !annContent.trim()} className="w-full">
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Event Roles Dialog */}
      {rolesEventId && clubId && (
        <AssignEventRolesDialog
          eventId={rolesEventId}
          clubId={clubId}
          open={!!rolesEventId}
          onOpenChange={(open) => { if (!open) setRolesEventId(null); }}
        />
      )}

      {/* Create Tour Dialog */}
      <CreateTourDialog
        open={showCreateTour}
        onOpenChange={setShowCreateTour}
        onCreated={() => {
          setShowCreateTour(false);
          queryClient.invalidateQueries({ queryKey: ["club-admin-tours", clubId] });
        }}
        defaultOrganizerClubId={clubId}
      />
    </div>
  );
};

export default ClubAdminDashboard;
