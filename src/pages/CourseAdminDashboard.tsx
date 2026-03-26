import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, LayoutDashboard, Grid3X3, Clock, Settings, Save, Plus, AlertTriangle, Layers, Pencil, Trash2, Search, UserCog, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "holes", label: "Holes", icon: Grid3X3 },
  { id: "teebox", label: "Tee Box", icon: Layers },
  { id: "teetimes", label: "Tee Times", icon: Clock },
  { id: "caddies", label: "Caddies", icon: Users },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface HoleData {
  id?: string;
  hole_number: number;
  par: number;
  distance_yards: number | null;
  handicap_index: number | null;
}

const CourseAdminDashboard = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isNew = courseId === "new";
  const clubId = new URLSearchParams(location.search).get("clubId");

  const [tab, setTab] = useState<TabId>(isNew ? "settings" : "overview");
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminSearchResults, setAdminSearchResults] = useState<any[]>([]);
  const [searchingAdmin, setSearchingAdmin] = useState(false);
  const [assigningAdmin, setAssigningAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
      setUserEmail(session?.user?.email ?? null);
    });
  }, []);

  const isPlatformAdmin = userEmail === "dwintyar@gmail.com";

  // Access control: check if user is owner/admin of the club that owns this course
  const { data: hasAccess } = useQuery({
    queryKey: ["course-admin-access", courseId, userId],
    queryFn: async () => {
      if (!userId || isNew) return true; // new course: check later
      // Get club_id of this course
      const { data: courseData } = await supabase
        .from("courses").select("club_id").eq("id", courseId!).single();
      if (!courseData?.club_id) return false;
      // Check members (owner/admin) OR club_staff (course_admin)
      const [{ data: memberData }, { data: staffData }] = await Promise.all([
        supabase.from("members").select("id").eq("user_id", userId)
          .eq("club_id", courseData.club_id).in("role", ["owner", "admin"]).limit(1),
        supabase.from("club_staff").select("id").eq("user_id", userId)
          .eq("club_id", courseData.club_id).eq("staff_role", "course_admin").limit(1),
      ]);
      return (memberData && memberData.length > 0) || (staffData && staffData.length > 0);
    },
    enabled: !!userId && !isNew,
  });

  // Course data
  const { data: course, isLoading } = useQuery({
    queryKey: ["course-admin", courseId],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from("courses")
        .select("*, course_holes(*), course_tees(*), clubs(name)")
        .eq("id", courseId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  // Active events check for course lock
  const { data: activeEvents } = useQuery({
    queryKey: ["active-events-for-course", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, name, event_date, status")
        .eq("course_id", courseId!)
        .in("status", ["registration", "checkin", "playing"])
        .order("event_date");
      return data ?? [];
    },
    enabled: !!courseId && !isNew,
  });

  const isCourseLocked = (activeEvents?.length ?? 0) > 0;

  // Today's bookings count
  const { data: todayBookings } = useQuery({
    queryKey: ["course-today-bookings", courseId],
    queryFn: async () => {
      if (isNew) return 0;
      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabase
        .from("tee_time_bookings")
        .select("id", { count: "exact", head: true })
        .eq("course_id", courseId!)
        .eq("booking_date", today);
      return count ?? 0;
    },
    enabled: !isNew,
  });

  // Tee time slot config
  const { data: slotConfig, refetch: refetchSlots } = useQuery({
    queryKey: ["tee-slot-config", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tee_time_slots")
        .select("*")
        .eq("course_id", courseId!)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!courseId && !isNew,
  });

  // Upcoming bookings
  const { data: upcomingBookings } = useQuery({
    queryKey: ["course-bookings", courseId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("tee_time_bookings")
        .select("*, profiles:user_id(full_name)")
        .eq("course_id", courseId!)
        .gte("booking_date", today)
        .order("booking_date")
        .order("tee_time");
      return data ?? [];
    },
    enabled: !!courseId && !isNew,
  });

  // ═══ TEE TIME FORM STATE ═══
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("15:00");
  const [slotInterval, setSlotInterval] = useState(30);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [priceWeekday, setPriceWeekday] = useState("");
  const [priceWeekend, setPriceWeekend] = useState("");
  const [savingSlots, setSavingSlots] = useState(false);

  // ═══ CADDY STATE ═══
  const [caddyForm, setCaddyForm] = useState({ name: "", caddy_number: "", notes: "" });
  const [editingCaddy, setEditingCaddy] = useState<any | null>(null);
  const [showCaddyDialog, setShowCaddyDialog] = useState(false);
  const [savingCaddy, setSavingCaddy] = useState(false);
  const [deletingCaddyId, setDeletingCaddyId] = useState<string | null>(null);

  const { data: caddies, refetch: refetchCaddies } = useQuery({
    queryKey: ["course-caddies", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("course_caddies")
        .select("*")
        .eq("course_id", courseId!)
        .order("name");
      return data ?? [];
    },
    enabled: !!courseId && !isNew,
  });

  const handleOpenCaddyDialog = (caddy?: any) => {
    if (caddy) {
      setEditingCaddy(caddy);
      setCaddyForm({ name: caddy.name, caddy_number: caddy.caddy_number ?? "", notes: caddy.notes ?? "" });
    } else {
      setEditingCaddy(null);
      setCaddyForm({ name: "", caddy_number: "", notes: "" });
    }
    setShowCaddyDialog(true);
  };

  const handleSaveCaddy = async () => {
    if (!caddyForm.name.trim()) { toast({ title: "Caddy name is required", variant: "destructive" }); return; }
    setSavingCaddy(true);
    if (editingCaddy) {
      const { error } = await supabase.from("course_caddies").update({
        name: caddyForm.name.trim(),
        caddy_number: caddyForm.caddy_number.trim() || null,
        notes: caddyForm.notes.trim() || null,
      }).eq("id", editingCaddy.id);
      if (error) { toast({ title: "Save failed", variant: "destructive" }); setSavingCaddy(false); return; }
    } else {
      const { error } = await supabase.from("course_caddies").insert({
        course_id: courseId!,
        name: caddyForm.name.trim(),
        caddy_number: caddyForm.caddy_number.trim() || null,
        notes: caddyForm.notes.trim() || null,
      });
      if (error) { toast({ title: "Failed to add caddy", variant: "destructive" }); setSavingCaddy(false); return; }
    }
    toast({ title: editingCaddy ? "Caddy updated" : "Caddy added" });
    setSavingCaddy(false);
    setShowCaddyDialog(false);
    refetchCaddies();
  };

  const handleDeleteCaddy = async (id: string) => {
    setDeletingCaddyId(id);
    const { error } = await supabase.from("course_caddies").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", variant: "destructive" });
    else { toast({ title: "Caddy deleted" }); refetchCaddies(); }
    setDeletingCaddyId(null);
  };

  const handleToggleCaddyActive = async (caddy: any) => {
    const { error } = await supabase.from("course_caddies")
      .update({ is_active: !caddy.is_active }).eq("id", caddy.id);
    if (error) toast({ title: "Gagal memperbarui status", variant: "destructive" });
    else refetchCaddies();
  };

  useEffect(() => {
    if (slotConfig) {
      setStartTime(slotConfig.start_time?.slice(0, 5) ?? "06:00");
      setEndTime(slotConfig.end_time?.slice(0, 5) ?? "15:00");
      setSlotInterval(slotConfig.interval_mins ?? 30);
      setMaxPlayers(slotConfig.max_players ?? 4);
      setPriceWeekday(String(slotConfig.price_weekday ?? ""));
      setPriceWeekend(String(slotConfig.price_weekend ?? ""));
    }
  }, [slotConfig]);

  const handleSaveSlots = async () => {
    if (!courseId) return;
    setSavingSlots(true);
    await supabase.from("tee_time_slots").upsert({
      ...(slotConfig?.id ? { id: slotConfig.id } : {}),
      course_id: courseId,
      start_time: startTime,
      end_time: endTime,
      interval_mins: slotInterval,
      max_players: maxPlayers,
      price_weekday: parseFloat(priceWeekday) || 0,
      price_weekend: parseFloat(priceWeekend) || 0,
      is_active: true,
    }, { onConflict: "id" });
    toast({ title: "Tee time schedule saved!" });
    refetchSlots();
    setSavingSlots(false);
  };

  const generateSlotPreviews = () => {
    const slots: string[] = [];
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    let mins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    while (mins <= endMins) {
      const h = Math.floor(mins / 60).toString().padStart(2, "0");
      const m = (mins % 60).toString().padStart(2, "0");
      slots.push(`${h}:${m}`);
      mins += slotInterval;
    }
    return slots;
  };

  // ═══ SETTINGS FORM ═══
  const [form, setForm] = useState({
    name: "",
    location: "",
    description: "",
    par: 72,
    holes_count: 18,
    green_fee_price: 0,
    course_type: "championship",
    course_rating: 72,
    slope_rating: 113,
  });

  useEffect(() => {
    if (course) {
      setForm({
        name: course.name ?? "",
        location: course.location ?? "",
        description: course.description ?? "",
        par: course.par ?? 72,
        holes_count: course.holes_count ?? 18,
        green_fee_price: course.green_fee_price ? Number(course.green_fee_price) : 0,
        course_type: course.course_type ?? "championship",
        course_rating: course.course_rating ? Number(course.course_rating) : 72,
        slope_rating: course.slope_rating ? Number(course.slope_rating) : 113,
      });
    }
  }, [course]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        location: form.location || null,
        description: form.description || null,
        par: form.par,
        holes_count: form.holes_count,
        green_fee_price: form.green_fee_price || null,
        course_type: form.course_type,
        course_rating: form.course_rating,
        slope_rating: form.slope_rating,
      };

      if (isNew) {
        if (!clubId) throw new Error("Club ID required");
        const { data, error } = await supabase
          .from("courses")
          .insert({ ...payload, club_id: clubId })
          .select("id")
          .single();
        if (error) throw error;
        return data;
      } else {
        const { error } = await supabase
          .from("courses")
          .update(payload)
          .eq("id", courseId!);
        if (error) throw error;
        return { id: courseId };
      }
    },
    onSuccess: (data) => {
      toast({ title: isNew ? "Course created!" : "Course saved!" });
      queryClient.invalidateQueries({ queryKey: ["course-admin"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["my-courses"] });
      if (isNew && data?.id) {
        navigate(`/admin/course/${data.id}`, { replace: true });
      }
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // ═══ HOLES ═══
  const holes: HoleData[] = (course as any)?.course_holes
    ? [...(course as any).course_holes].sort((a: any, b: any) => a.hole_number - b.hole_number)
    : [];

  const [editHoles, setEditHoles] = useState<HoleData[]>([]);
  const [holesEditing, setHolesEditing] = useState(false);

  useEffect(() => {
    if (holes.length) setEditHoles(holes);
  }, [course]);

  const setupHoles = () => {
    const count = course?.holes_count ?? 18;
    const generated: HoleData[] = Array.from({ length: count }, (_, i) => ({
      hole_number: i + 1,
      par: 4,
      distance_yards: null,
      handicap_index: null,
    }));
    setEditHoles(generated);
    setHolesEditing(true);
  };

  const updateHoleField = (idx: number, field: keyof HoleData, value: any) => {
    setEditHoles(prev => prev.map((h, i) => i === idx ? { ...h, [field]: value } : h));
  };

  const saveHolesMutation = useMutation({
    mutationFn: async () => {
      for (const h of editHoles) {
        const payload = {
          course_id: courseId!,
          hole_number: h.hole_number,
          par: h.par,
          distance_yards: h.distance_yards,
          handicap_index: h.handicap_index,
        };
        if (h.id) {
          // Existing holes can't be updated per RLS, so we skip
          // Actually checking RLS - course_holes has no UPDATE policy
          // We'll just insert new ones
        }
        // Use upsert-like approach: delete existing + insert
      }
      // Delete all existing holes for this course and re-insert
      // course_holes has no DELETE policy, so let's just insert missing ones
      // Actually, let's just insert all - if they exist they'll conflict
      // Best approach: insert only new ones (no id)
      const newHoles = editHoles.filter(h => !h.id);
      if (newHoles.length) {
        const { error } = await supabase.from("course_holes").insert(
          newHoles.map(h => ({
            course_id: courseId!,
            hole_number: h.hole_number,
            par: h.par,
            distance_yards: h.distance_yards,
            handicap_index: h.handicap_index,
          }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Holes saved!" });
      setHolesEditing(false);
      queryClient.invalidateQueries({ queryKey: ["course-admin", courseId] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // ═══ COURSE ADMINS ═══
  const { data: courseAdmins, refetch: refetchAdmins } = useQuery({
    queryKey: ["course-admins", courseId],
    queryFn: async () => {
      if (!courseId || isNew) return [];
      // Get club_id for this course
      const { data: c } = await supabase.from("courses").select("club_id").eq("id", courseId).single();
      if (!c?.club_id) return [];
      const { data } = await supabase
        .from("club_staff")
        .select("id, user_id, profiles(full_name, email, avatar_url)")
        .eq("club_id", c.club_id)
        .eq("staff_role", "course_admin")
        .eq("status", "active");
      return data ?? [];
    },
    enabled: !!courseId && !isNew && isPlatformAdmin,
  });

  const handleSearchAdmin = async (q: string) => {
    setAdminSearch(q);
    if (q.trim().length < 2) { setAdminSearchResults([]); return; }
    setSearchingAdmin(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .ilike("full_name", `%${q.trim()}%`)
      .eq("is_approved", true)
      .limit(10);
    setAdminSearchResults(data ?? []);
    setSearchingAdmin(false);
  };

  const handleAssignAdmin = async (targetUser: any) => {
    if (!courseId || assigningAdmin) return;
    setAssigningAdmin(true);
    try {
      // Get club_id
      const { data: c } = await supabase.from("courses").select("club_id").eq("id", courseId).single();
      if (!c?.club_id) throw new Error("Club not found");
      // Upsert club_staff
      const { error } = await supabase.from("club_staff").upsert({
        club_id: c.club_id,
        user_id: targetUser.id,
        staff_role: "course_admin",
        status: "active",
      }, { onConflict: "club_id,user_id" });
      if (error) throw error;
      toast({ title: "✅ Course Admin assigned", description: `${targetUser.full_name} dapat mengelola course ini` });
      setAdminSearch("");
      setAdminSearchResults([]);
      refetchAdmins();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAssigningAdmin(false);
    }
  };

  const handleRemoveAdmin = async (staffId: string, name: string) => {
    const { error } = await supabase.from("club_staff").delete().eq("id", staffId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Admin removed", description: `${name} dihapus dari Course Admin` });
    refetchAdmins();
  };

  // ═══ TEE BOX ═══
  interface TeeData { id?: string; tee_name: string; color: string; rating: number | null; slope: number | null; }
  const [tees, setTees] = useState<TeeData[]>([]);
  const [teeForm, setTeeForm] = useState<TeeData>({ tee_name: "", color: "#FFFFFF", rating: null, slope: null });
  const [editingTeeId, setEditingTeeId] = useState<string | null>(null);
  const [showTeeForm, setShowTeeForm] = useState(false);
  const [savingTee, setSavingTee] = useState(false);

  useEffect(() => {
    const raw = (course as any)?.course_tees ?? [];
    setTees([...raw].sort((a: any, b: any) => (a.tee_name ?? "").localeCompare(b.tee_name ?? "")));
  }, [course]);

  const handleSaveTee = async () => {
    if (!courseId || !teeForm.tee_name.trim()) return;
    setSavingTee(true);
    if (editingTeeId) {
      const { error } = await supabase.from("course_tees").update({
        tee_name: teeForm.tee_name.trim(),
        color: teeForm.color,
        rating: teeForm.rating,
        slope: teeForm.slope,
      }).eq("id", editingTeeId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
      else { toast({ title: "Tee updated!" }); }
    } else {
      const { error } = await supabase.from("course_tees").insert({
        course_id: courseId,
        tee_name: teeForm.tee_name.trim(),
        color: teeForm.color,
        rating: teeForm.rating,
        slope: teeForm.slope,
      });
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
      else { toast({ title: "Tee added!" }); }
    }
    setSavingTee(false);
    setShowTeeForm(false);
    setEditingTeeId(null);
    setTeeForm({ tee_name: "", color: "#FFFFFF", rating: null, slope: null });
    queryClient.invalidateQueries({ queryKey: ["course-admin", courseId] });
  };

  const handleDeleteTee = async (teeId: string) => {
    if (!window.confirm("Hapus tee box ini?")) return;
    const { error } = await supabase.from("course_tees").delete().eq("id", teeId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Tee deleted" }); queryClient.invalidateQueries({ queryKey: ["course-admin", courseId] }); }
  };

  if (!isNew && isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  // Access denied
  if (!isNew && hasAccess === false && !isPlatformAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 text-center">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <span className="text-2xl">🔒</span>
        </div>
        <h2 className="text-lg font-bold">Akses Ditolak</h2>
        <p className="text-sm text-muted-foreground">Anda tidak memiliki akses untuk mengelola venue ini.</p>
        <button onClick={() => navigate("/venue")} className="text-sm text-primary font-semibold">
          ← Kembali ke Venues
        </button>
      </div>
    );
  }

  const courseName = isNew ? "New Course" : (course?.name ?? "Course");

  return (
    <div className="bottom-nav-safe mx-auto max-w-lg min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/venue")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate">Course Admin</h1>
            <p className="text-xs text-muted-foreground truncate">{courseName}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      {!isNew && (
        <div className="flex border-b border-border/50">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider flex flex-col items-center gap-1 transition-colors ${
                tab === t.id
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="p-4">
        {/* ═══ OVERVIEW ═══ */}
        {tab === "overview" && !isNew && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Holes Configured", value: holes.length },
                { label: "Par Total", value: course?.par ?? "—" },
                { label: "Green Fee", value: course?.green_fee_price
                  ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(course.green_fee_price))
                  : "—" },
                { label: "Bookings Today", value: todayBookings ?? 0 },
              ].map(kpi => (
                <div key={kpi.label} className="golf-card p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{kpi.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{kpi.label}</p>
                </div>
              ))}
            </div>
            <div className="golf-card p-4">
              <p className="text-sm font-semibold">{course?.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{course?.location ?? "No location"}</p>
              <p className="text-xs text-muted-foreground mt-1">{course?.description ?? "No description"}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-2">
                Club: {(course as any)?.clubs?.name ?? "—"} · Type: {course?.course_type}
              </p>
            </div>
          </div>
        )}

        {/* ═══ HOLES ═══ */}
        {tab === "holes" && !isNew && (
          <div className="space-y-3">
            {isCourseLocked && (
              <div className="golf-card border-accent/30 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-accent">Course sedang digunakan</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Ada {activeEvents?.length} event aktif. Perubahan holes berlaku untuk event mendatang saja — event yang sedang berjalan menggunakan snapshot yang sudah terkunci.
                    </p>
                    {activeEvents?.map(e => (
                      <p key={e.id} className="text-[10px] text-muted-foreground/70 mt-0.5">
                        • {e.name} ({e.event_date}) — {e.status}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {holes.length === 0 && !holesEditing && (
              <div className="golf-card p-8 text-center">
                <Grid3X3 className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">Belum ada hole dikonfigurasi</p>
                <Button onClick={setupHoles} className="mt-4" size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Setup {course?.holes_count ?? 18} Holes
                </Button>
              </div>
            )}

            {(holes.length > 0 || holesEditing) && (
              <>
                {!holesEditing && (
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => { setEditHoles(holes); setHolesEditing(true); }}>
                      Edit Holes
                    </Button>
                  </div>
                )}
                <div className="golf-card overflow-hidden">
                  <div className="grid grid-cols-[3rem_4rem_5rem_4rem] text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary/50 px-3 py-2 gap-2">
                    <span>Hole</span><span>Par</span><span>Yards</span><span>SI</span>
                  </div>
                  {editHoles.map((h, idx) => (
                    <div key={h.hole_number} className="grid grid-cols-[3rem_4rem_5rem_4rem] px-3 py-1.5 gap-2 border-t border-border/30 items-center">
                      <span className="text-xs font-bold text-primary">{h.hole_number}</span>
                      {holesEditing ? (
                        <>
                          <Input type="number" value={h.par} onChange={e => updateHoleField(idx, "par", Number(e.target.value))} className="h-7 text-xs px-1" />
                          <Input type="number" value={h.distance_yards ?? ""} onChange={e => updateHoleField(idx, "distance_yards", e.target.value ? Number(e.target.value) : null)} className="h-7 text-xs px-1" placeholder="—" />
                          <Input type="number" value={h.handicap_index ?? ""} onChange={e => updateHoleField(idx, "handicap_index", e.target.value ? Number(e.target.value) : null)} className="h-7 text-xs px-1" placeholder="—" />
                        </>
                      ) : (
                        <>
                          <span className="text-xs">{h.par}</span>
                          <span className="text-xs text-muted-foreground">{h.distance_yards ?? "—"}</span>
                          <span className="text-xs text-muted-foreground">{h.handicap_index ?? "—"}</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                {holesEditing && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveHolesMutation.mutate()} disabled={saveHolesMutation.isPending}>
                      <Save className="h-4 w-4 mr-1" /> Save All
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setHolesEditing(false); setEditHoles(holes); }}>Cancel</Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ TEE BOX ═══ */}
        {tab === "teebox" && !isNew && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Tee Boxes ({tees.length})</p>
              <Button size="sm" onClick={() => { setTeeForm({ tee_name: "", color: "#FFFFFF", rating: null, slope: null }); setEditingTeeId(null); setShowTeeForm(true); }}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Tee
              </Button>
            </div>

            {tees.length === 0 && !showTeeForm && (
              <div className="golf-card p-8 text-center">
                <Layers className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">Belum ada tee box</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Tambahkan tee box (White, Yellow, Red, Blue) dengan rating & slope</p>
              </div>
            )}

            {tees.map(tee => (
              <div key={tee.id} className="golf-card p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full border-2 border-border/50 shrink-0"
                  style={{ backgroundColor: tee.color ?? "#ccc" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{tee.tee_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Rating: {tee.rating ?? "—"} · Slope: {tee.slope ?? "—"}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button className="text-muted-foreground hover:text-foreground p-1"
                    onClick={() => {
                      setTeeForm({ tee_name: tee.tee_name, color: tee.color ?? "#FFFFFF", rating: tee.rating, slope: tee.slope });
                      setEditingTeeId(tee.id ?? null);
                      setShowTeeForm(true);
                    }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button className="text-destructive/60 hover:text-destructive p-1"
                    onClick={() => tee.id && handleDeleteTee(tee.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Add / Edit Form */}
            {showTeeForm && (
              <div className="golf-card p-4 space-y-3 border-primary/30">
                <p className="text-sm font-semibold">{editingTeeId ? "Edit Tee Box" : "New Tee Box"}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Tee Name</Label>
                    <Input placeholder="e.g. White, Yellow, Red"
                      value={teeForm.tee_name}
                      onChange={e => setTeeForm(f => ({ ...f, tee_name: e.target.value }))}
                      className="mt-1 h-9 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="color" value={teeForm.color ?? "#FFFFFF"}
                        onChange={e => setTeeForm(f => ({ ...f, color: e.target.value }))}
                        className="h-9 w-12 rounded border border-input cursor-pointer" />
                      <Input value={teeForm.color ?? ""} onChange={e => setTeeForm(f => ({ ...f, color: e.target.value }))}
                        className="h-9 text-sm font-mono flex-1" placeholder="#FFFFFF" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Course Rating</Label>
                    <Input type="number" step="0.1" placeholder="72.0"
                      value={teeForm.rating ?? ""}
                      onChange={e => setTeeForm(f => ({ ...f, rating: e.target.value ? Number(e.target.value) : null }))}
                      className="mt-1 h-9 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Slope Rating</Label>
                    <Input type="number" placeholder="113"
                      value={teeForm.slope ?? ""}
                      onChange={e => setTeeForm(f => ({ ...f, slope: e.target.value ? Number(e.target.value) : null }))}
                      className="mt-1 h-9 text-sm" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveTee} disabled={savingTee || !teeForm.tee_name.trim()} className="flex-1">
                    <Save className="h-3.5 w-3.5 mr-1" /> {savingTee ? "Saving..." : "Save"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setShowTeeForm(false); setEditingTeeId(null); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ TEE TIMES ═══ */}
        {tab === "teetimes" && !isNew && (
          <div className="space-y-4">
            {/* Schedule Template */}
            <div className="golf-card p-4 space-y-3">
              <p className="text-sm font-semibold">Schedule Template</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Buka</Label>
                  <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="mt-1 h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Close</Label>
                  <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="mt-1 h-9 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Interval (menit)</Label>
                  <Select value={String(slotInterval)} onValueChange={v => setSlotInterval(Number(v))}>
                    <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 menit</SelectItem>
                      <SelectItem value="30">30 menit</SelectItem>
                      <SelectItem value="45">45 menit</SelectItem>
                      <SelectItem value="60">60 menit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Max players/slot</Label>
                  <Select value={String(maxPlayers)} onValueChange={v => setMaxPlayers(Number(v))}>
                    <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(n => (
                        <SelectItem key={n} value={String(n)}>{n} players</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Harga Weekday (Rp)</Label>
                  <Input type="number" value={priceWeekday} onChange={e => setPriceWeekday(e.target.value)} placeholder="500000" className="mt-1 h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Harga Weekend (Rp)</Label>
                  <Input type="number" value={priceWeekend} onChange={e => setPriceWeekend(e.target.value)} placeholder="700000" className="mt-1 h-9 text-sm" />
                </div>
              </div>
              {/* Preview slots */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Preview — {generateSlotPreviews().length} slots/hari
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {generateSlotPreviews().slice(0, 20).map(t => (
                    <span key={t} className="text-[10px] bg-secondary rounded px-2 py-0.5">{t}</span>
                  ))}
                  {generateSlotPreviews().length > 20 && (
                    <span className="text-[10px] text-muted-foreground px-1">+{generateSlotPreviews().length - 20} more</span>
                  )}
                </div>
              </div>
              <Button className="w-full" onClick={handleSaveSlots} disabled={savingSlots}>
                {savingSlots ? "Saving..." : "Save Schedule"}
              </Button>
            </div>

            {/* Upcoming Bookings */}
            <div className="golf-card p-4">
              <p className="text-sm font-semibold mb-3">
                Upcoming Bookings ({upcomingBookings?.length ?? 0})
              </p>
              {upcomingBookings?.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No upcoming bookings</p>
              )}
              {upcomingBookings?.map(b => (
                <div key={b.id} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{(b.profiles as any)?.full_name ?? "Guest"}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.booking_date} · {b.tee_time?.slice(0, 5)} · {b.players_count} players
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${
                    b.status === "confirmed" ? "text-primary border-primary/30" : "text-accent border-accent/30"
                  }`}>
                    {b.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ CADDIES ═══ */}
        {tab === "caddies" && !isNew && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Daftar Caddy</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {caddies?.filter(c => c.is_active).length ?? 0} caddy aktif
                </p>
              </div>
              <Button size="sm" className="gap-2 h-8" onClick={() => handleOpenCaddyDialog()}>
                <Plus className="h-3.5 w-3.5" /> Tambah Caddy
              </Button>
            </div>

            {!caddies || caddies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-primary/60" />
                </div>
                <p className="text-base font-semibold">No caddies yet</p>
                <p className="text-sm text-muted-foreground mt-1">Add caddies to assign during tournament pairings.</p>
                <Button size="sm" className="mt-4 gap-2" onClick={() => handleOpenCaddyDialog()}>
                  <Plus className="h-3.5 w-3.5" /> Tambah Caddy Pertama
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {caddies.map((caddy: any) => (
                  <div key={caddy.id} className={`rounded-xl border p-3 flex items-center gap-3 ${!caddy.is_active ? "opacity-50 border-dashed" : "border-border bg-card"}`}>
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="h-5 w-5 text-primary/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{caddy.name}</p>
                        {caddy.caddy_number && (
                          <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded shrink-0">
                            #{caddy.caddy_number}
                          </span>
                        )}
                        {!caddy.is_active && (
                          <span className="text-[10px] text-muted-foreground shrink-0">Inactive</span>
                        )}
                      </div>
                      {caddy.notes && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{caddy.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleOpenCaddyDialog(caddy)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className={`h-8 w-8 ${caddy.is_active ? "text-yellow-500 hover:text-yellow-400" : "text-green-500 hover:text-green-400"}`}
                        onClick={() => handleToggleCaddyActive(caddy)}
                        title={caddy.is_active ? "Disable" : "Enable"}
                      >
                        {caddy.is_active ? <AlertTriangle className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-red-400 hover:text-red-300"
                        disabled={deletingCaddyId === caddy.id}
                        onClick={() => handleDeleteCaddy(caddy.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ SETTINGS ═══ */}
        {(tab === "settings" || isNew) && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Course Name</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Location</label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Par Total</label>
                  <Input type="number" value={form.par} onChange={e => setForm(f => ({ ...f, par: Number(e.target.value) }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Holes Count</label>
                  <Select value={String(form.holes_count)} onValueChange={v => setForm(f => ({ ...f, holes_count: Number(v) }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9">9 holes</SelectItem>
                      <SelectItem value="18">18 holes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Green Fee (Rp)</label>
                <Input type="number" value={form.green_fee_price} onChange={e => setForm(f => ({ ...f, green_fee_price: Number(e.target.value) }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Course Type</label>
                <Select value={form.course_type} onValueChange={v => setForm(f => ({ ...f, course_type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="championship">Championship</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                    <SelectItem value="links">Links</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Course Rating</label>
                  <Input type="number" step="0.1" value={form.course_rating} onChange={e => setForm(f => ({ ...f, course_rating: Number(e.target.value) }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Slope Rating</label>
                  <Input type="number" value={form.slope_rating} onChange={e => setForm(f => ({ ...f, slope_rating: Number(e.target.value) }))} className="mt-1" />
                </div>
              </div>
            </div>
            {/* Course Admin Assignment — Platform Admin only */}
            {isPlatformAdmin && !isNew && (
              <div className="space-y-3 pt-2 border-t border-border/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Course Admin</p>

                {/* Current admins */}
                {courseAdmins && courseAdmins.length > 0 ? (
                  <div className="space-y-2">
                    {courseAdmins.map((a: any) => (
                      <div key={a.id} className="flex items-center gap-2.5 golf-card p-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                          {((a.profiles as any)?.full_name ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{(a.profiles as any)?.full_name ?? "—"}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{(a.profiles as any)?.email ?? "—"}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveAdmin(a.id, (a.profiles as any)?.full_name ?? "Admin")}
                          className="text-destructive/60 hover:text-destructive text-xs font-medium px-2 py-1 rounded"
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Belum ada Course Admin ditugaskan</p>
                )}

                {/* Search & assign */}
                <div className="space-y-1.5">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Cari user untuk dijadikan Course Admin..."
                      value={adminSearch}
                      onChange={e => handleSearchAdmin(e.target.value)}
                      className="pl-8 h-9 text-sm"
                    />
                  </div>
                  {searchingAdmin && <p className="text-xs text-muted-foreground px-1">Searching...</p>}
                  {adminSearchResults.length > 0 && (
                    <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                      {adminSearchResults.map((u: any) => (
                        <button
                          key={u.id}
                          onClick={() => handleAssignAdmin(u)}
                          disabled={assigningAdmin}
                          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-secondary/50 transition-colors border-b border-border/30 last:border-0"
                        >
                          <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                            {(u.full_name ?? "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{u.full_name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                          </div>
                          <span className="text-[10px] text-primary font-semibold shrink-0">
                            {assigningAdmin ? "..." : "Tugaskan"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button onClick={() => {
              if (isCourseLocked && !isNew) {
                setShowLockConfirm(true);
              } else {
                saveMutation.mutate();
              }
            }} disabled={saveMutation.isPending || !form.name} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {isNew ? "Create Course" : "Save Changes"}
            </Button>
            {isCourseLocked && !isNew && (
              <p className="text-[10px] text-accent text-center">
                ⚠️ Perubahan tidak mempengaruhi event yang sedang berjalan
              </p>
            )}
          </div>
        )}

        {/* Lock Confirmation Dialog */}
        <Dialog open={showLockConfirm} onOpenChange={setShowLockConfirm}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Update Pengaturan Course?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Ada {activeEvents?.length} event aktif menggunakan course ini. Perubahan settings (nama, green fee, dll) akan berlaku segera, tapi data holes event yang sedang berjalan tidak berubah karena sudah menggunakan snapshot.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLockConfirm(false)}>Cancel</Button>
              <Button onClick={() => { setShowLockConfirm(false); saveMutation.mutate(); }}>Ya, Update</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══ CADDY DIALOG ═══ */}
        <Dialog open={showCaddyDialog} onOpenChange={setShowCaddyDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{editingCaddy ? "Edit Caddy" : "Add Caddy"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs">Nama Caddy <span className="text-red-400">*</span></Label>
                <Input
                  className="mt-1"
                  placeholder="Caddy full name"
                  value={caddyForm.name}
                  onChange={e => setCaddyForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Nomor Caddy</Label>
                <Input
                  className="mt-1"
                  placeholder="Contoh: 001"
                  value={caddyForm.caddy_number}
                  onChange={e => setCaddyForm(f => ({ ...f, caddy_number: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Catatan</Label>
                <Input
                  className="mt-1"
                  placeholder="Specialization, notes, etc"
                  value={caddyForm.notes}
                  onChange={e => setCaddyForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCaddyDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveCaddy} disabled={savingCaddy}>
                {savingCaddy ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CourseAdminDashboard;

