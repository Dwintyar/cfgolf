import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, User, Building2, Lock, Palette, LogOut, ChevronRight, Camera, LayoutDashboard, Bell, Gamepad2, Users, Trophy } from "lucide-react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useDemoInstall } from "@/hooks/use-demo-install";
import ClaimProfileDialog from "@/components/ClaimProfileDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

type Section = "main" | "profile" | "club" | "password";
type AdminAccess = "none" | "platform" | "club";

const Settings = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<Section>("main");
  const { permission, isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  const [userId, setUserId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : true;
  });
  const [demoMode, setDemoMode] = useState(false);
  const [showDemoConfirm, setShowDemoConfirm] = useState(false);
  const [showClaim, setShowClaim] = useState(false);
  const { installDemo, uninstallDemo, loading: demoLoading } = useDemoInstall(userId);

  // Profile form
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Password form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  // Apply theme class
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.remove("light");
    } else {
      root.classList.add("light");
    }
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/login", { replace: true });
      } else {
        setUserId(session.user.id);
      }
    });
  }, [navigate]);

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ["my-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setBio(profile.bio ?? "");
      setLocation(profile.location ?? "");
      setDemoMode(profile.demo_mode ?? false);
    }
  }, [profile]);

  const { data: myClubs } = useQuery({
    queryKey: ["my-clubs", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("role, clubs(id, name, logo_url)")
        .eq("user_id", userId!);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Check admin access
  const { data: adminAccess } = useQuery<AdminAccess>({
    queryKey: ["admin-access-check", userId],
    queryFn: async () => {
      // Check platform admin
      const { data: sysAdmin } = await supabase
        .from("system_admins")
        .select("admin_level")
        .eq("user_id", userId!)
        .eq("is_active", true)
        .maybeSingle();
      if (sysAdmin) return "platform" as AdminAccess;

      // Check club admin
      const { data: clubRole } = await supabase
        .from("members")
        .select("club_id, role")
        .eq("user_id", userId!)
        .in("role", ["owner", "admin"])
        .limit(1);
      if (clubRole && clubRole.length > 0) return "club" as AdminAccess;

      return "none" as AdminAccess;
    },
    enabled: !!userId,
  });

  const firstAdminClubId = useQuery({
    queryKey: ["admin-first-club", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("members")
        .select("club_id")
        .eq("user_id", userId!)
        .in("role", ["owner", "admin"])
        .limit(1)
        .maybeSingle();
      return data?.club_id ?? null;
    },
    enabled: !!userId && adminAccess === "club",
  });

  const handleAdminDashboard = () => {
    if (adminAccess === "platform") {
      navigate("/admin");
    } else if (adminAccess === "club" && firstAdminClubId.data) {
      navigate(`/admin/club/${firstAdminClubId.data}`);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 2MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: `${publicUrl}?t=${Date.now()}`, updated_at: new Date().toISOString() })
      .eq("id", userId);

    setUploading(false);
    if (updateError) { toast.error(updateError.message); return; }
    toast.success("Avatar diperbarui!");
    refetchProfile();
  };

  const handleSaveProfile = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, bio, location, updated_at: new Date().toISOString() })
      .eq("id", userId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated");
    refetchProfile();
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPw(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Kata sandi berhasil diubah");
    setNewPassword("");
    setConfirmPassword("");
    setSection("main");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  const initials = (profile?.full_name ?? "U")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (section === "profile") {
    return (
      <div className="bottom-nav-safe">
        <div className="flex items-center gap-2 p-4">
          <button onClick={() => setSection("main")} className="rounded-full p-1.5 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-xl font-bold">Edit Profile</h1>
        </div>
        <div className="space-y-4 px-4">
          {/* Avatar with upload */}
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="h-20 w-20 border-2 border-primary/30">
                <AvatarImage src={profile?.avatar_url ?? ""} />
                <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors">
                <Camera className="h-3.5 w-3.5" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
              </label>
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Nama Lengkap</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Bio</Label>
            <Input value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us about yourself" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Location</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, State" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Handicap</Label>
            <Input value={profile?.handicap ?? "—"} disabled className="mt-1 opacity-60" />
            <p className="mt-1 text-[10px] text-muted-foreground">Handicap is updated automatically after tournaments</p>
          </div>
          <Button className="w-full" onClick={handleSaveProfile} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>
    );
  }

  if (section === "club") {
    return (
      <div className="bottom-nav-safe">
        <div className="flex items-center gap-2 p-4">
          <button onClick={() => setSection("main")} className="rounded-full p-1.5 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-xl font-bold">My Clubs</h1>
        </div>
        <div className="space-y-2 px-4">
          {myClubs?.length === 0 && (
            <div className="golf-card p-6 text-center">
              <Building2 className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">You haven't joined any club yet</p>
              <Button size="sm" className="mt-3" onClick={() => navigate("/clubs")}>Browse Clubs</Button>
            </div>
          )}
          {myClubs?.map((m: any) => (
            <button
              key={m.clubs.id}
              onClick={() => navigate(`/clubs/${m.clubs.id}`)}
              className="golf-card w-full flex items-center gap-3 p-3 text-left hover:border-primary/30 transition-all"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={m.clubs.logo_url ?? ""} />
                <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
                  {m.clubs.name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{m.clubs.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{m.role}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (section === "password") {
    return (
      <div className="bottom-nav-safe">
        <div className="flex items-center gap-2 p-4">
          <button onClick={() => setSection("main")} className="rounded-full p-1.5 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-xl font-bold">Change Password</h1>
        </div>
        <div className="space-y-4 px-4">
          <div>
            <Label className="text-xs text-muted-foreground">Kata Sandi Baru</Label>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Konfirmasi Kata Sandi</Label>
            <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-1" />
          </div>
          <Button className="w-full" onClick={handleChangePassword} disabled={changingPw}>
            {changingPw ? "Updating…" : "Update Password"}
          </Button>
        </div>
      </div>
    );
  }

  // Main settings menu
  return (
    <div className="bottom-nav-safe">
      <div className="flex items-center gap-2 p-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-xl font-bold">Settings</h1>
      </div>

      {/* User card */}
      <div className="mx-4 golf-card p-4 flex items-center gap-3">
        <Avatar className="h-14 w-14 border-2 border-primary/30">
          <AvatarImage src={profile?.avatar_url ?? ""} />
          <AvatarFallback className="bg-primary/20 text-primary text-lg font-bold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-display text-base font-semibold truncate">{profile?.full_name || "Golfer"}</p>
          <p className="text-xs text-muted-foreground">{profile?.location || "No location set"}</p>
          {profile?.handicap != null && (
            <p className="text-xs text-primary font-medium">HCP {Number(profile.handicap)}</p>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-1 px-4">
        <SettingsItem icon={User} label="Edit Profile" onClick={() => setSection("profile")} />
        <SettingsItem icon={Building2} label="My Clubs" onClick={() => setSection("club")} />
        <SettingsItem icon={Lock} label="Change Password" onClick={() => setSection("password")} />
        {adminAccess && adminAccess !== "none" && (
          <SettingsItem icon={LayoutDashboard} label="Admin Dashboard" onClick={handleAdminDashboard} />
        )}
        <SettingsItem icon={Users} label="GBPlay Cooperative 🏌️" onClick={() => navigate("/cooperative")} />
        <SettingsItem icon={Trophy} label="Klaim Data Turnamen EGT" onClick={() => setShowClaim(true)} />

        <Separator className="my-3" />

        <div className="golf-card flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <Palette className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium">Dark Mode</span>
          </div>
          <Switch checked={darkMode} onCheckedChange={setDarkMode} />
        </div>

        {/* Demo Mode */}
        <div className="golf-card p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Gamepad2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <span className="text-sm font-medium">Mode Demo</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {demoMode ? "Data contoh aktif" : "Coba platform dengan data contoh"}
                </p>
              </div>
            </div>
            <Switch
              checked={demoMode}
              disabled={demoLoading}
              onCheckedChange={async (checked) => {
                if (checked) {
                  const ok = await installDemo();
                  if (ok) {
                    setDemoMode(true);
                    toast.success("Mode demo aktif! Cek tab Bookings di profil Anda.");
                    queryClient.invalidateQueries();
                  } else {
                    toast.error("Gagal mengaktifkan demo");
                  }
                } else {
                  setShowDemoConfirm(true);
                }
              }}
            />
          </div>
          {demoMode && (
            <div className="text-[11px] text-muted-foreground space-y-1.5 pl-12 border-t border-border/50 pt-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Data aktif</p>
              <p>✓ Anggota GolfBuana Demo Club</p>
              <p>✓ 1 ronde selesai di Jagorawi (90 gross · 72 nett)</p>
              <p>✓ 18 hole scores lengkap</p>
              <p>✓ 1 booking tee time pending</p>
              <p>✓ 1 booking tee time dikonfirmasi</p>
              <button
                onClick={() => navigate("/how-it-works")}
                className="text-primary underline underline-offset-2 mt-1 block"
              >
                Lihat panduan platform →
              </button>
            </div>
          )}
        </div>

        {/* Demo uninstall confirm dialog */}
        {showDemoConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
            onClick={() => setShowDemoConfirm(false)}>
            <div className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm space-y-4"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Gamepad2 className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Hapus data demo?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Data nyata Anda tidak akan terpengaruh.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowDemoConfirm(false)}>
                  Batal
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={demoLoading}
                  onClick={async () => {
                    const ok = await uninstallDemo();
                    if (ok) {
                      setDemoMode(false);
                      setShowDemoConfirm(false);
                      toast.success("Mode demo dinonaktifkan");
                      queryClient.invalidateQueries();
                    } else {
                      toast.error("Gagal menonaktifkan demo");
                    }
                  }}
                >
                  {demoLoading ? "Menghapus..." : "Hapus & Inactivekan"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="golf-card flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <Bell className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <span className="text-sm font-medium">Push Notifications</span>
              <p className="text-xs text-muted-foreground mt-0.5">
                {permission === "denied"
                  ? "Blocked in browser settings"
                  : permission === "unsupported"
                  ? "Not supported on this device"
                  : isSubscribed
                  ? "You'll receive activity alerts"
                  : "Enable to get activity alerts"}
              </p>
            </div>
          </div>
          {permission === "denied" || permission === "unsupported" ? (
            <span className="text-xs text-muted-foreground">
              {permission === "denied" ? "Blocked" : "N/A"}
            </span>
          ) : (
            <Switch
              checked={isSubscribed}
              disabled={pushLoading}
              onCheckedChange={async (checked) => {
                if (checked) {
                  const ok = await subscribe();
                  if (!ok && permission !== "denied") toast.error("Failed to enable notifications");
                  else if (ok) toast.success("Notifications enabled!");
                } else {
                  await unsubscribe();
                  toast.success("Notifications disabled");
                }
              }}
            />
          )}
        </div>

        <Separator className="my-3" />

        <button
          onClick={handleLogout}
          className="golf-card w-full flex items-center gap-3 p-3 text-destructive hover:border-destructive/30 transition-all"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10">
            <LogOut className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>

      {showClaim && userId && (
        <ClaimProfileDialog
          open={showClaim}
          onClose={() => setShowClaim(false)}
          claimantId={userId}
          claimantName={profile?.full_name ?? ""}
        />
      )}
    </div>
  );
};

const SettingsItem = ({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="golf-card w-full flex items-center gap-3 p-3 hover:border-primary/30 transition-all"
  >
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <span className="flex-1 text-left text-sm font-medium">{label}</span>
    <ChevronRight className="h-4 w-4 text-muted-foreground" />
  </button>
);

export default Settings;
