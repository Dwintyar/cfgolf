import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, User, Building2, Lock, Palette, LogOut, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

type Section = "main" | "profile" | "club" | "password";

const Settings = () => {
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>("main");
  const [userId, setUserId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(true);

  // Profile form
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  // Password form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

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

  // Sync form with profile data
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setBio(profile.bio ?? "");
      setLocation(profile.location ?? "");
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
    toast.success("Password changed successfully");
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
          <div className="flex justify-center">
            <Avatar className="h-20 w-20 border-2 border-primary/30">
              <AvatarImage src={profile?.avatar_url ?? ""} />
              <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">{initials}</AvatarFallback>
            </Avatar>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Full Name</Label>
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
            <Label className="text-xs text-muted-foreground">New Password</Label>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Confirm Password</Label>
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
