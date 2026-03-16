import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Camera, Users, Trophy, ArrowRight, Check } from "lucide-react";
import heroImg from "@/assets/golf-hero.jpg";

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);

  // Step 1 state
  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [handicap, setHandicap] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  // Step 2 state
  const [joinedClubIds, setJoinedClubIds] = useState<Set<string>>(new Set());
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/login");
        return;
      }
      setUserId(user.id);
      supabase
        .from("profiles")
        .select("onboarding_completed, full_name, avatar_url, location, handicap")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.onboarding_completed) {
            navigate("/news", { replace: true });
            return;
          }
          if (data?.full_name) setFullName(data.full_name);
          if (data?.avatar_url) setAvatarUrl(data.avatar_url);
          if (data?.location) setLocation(data.location);
          if (data?.handicap != null) setHandicap(String(data.handicap));
        });
    });
  }, [navigate]);

  const { data: clubs } = useQuery({
    queryKey: ["onboarding-clubs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clubs")
        .select("id, name, description, logo_url, members(count)")
        .eq("facility_type", "golf_club")
        .eq("is_personal", false)
        .order("name")
        .limit(6);
      return data ?? [];
    },
    enabled: step === 2,
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Upload gagal");
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = urlData.publicUrl + "?t=" + Date.now();
    setAvatarUrl(url);
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
    setUploading(false);
    toast.success("Foto diupload");
  };

  const handleStep1Next = async () => {
    if (!fullName.trim() || !userId) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        location: location.trim() || null,
        handicap: handicap ? parseInt(handicap) : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setStep(2);
  };

  const handleJoinClub = async (clubId: string) => {
    if (!userId) return;
    setJoiningId(clubId);
    const { error } = await supabase
      .from("members")
      .insert({ club_id: clubId, user_id: userId, role: "member" });
    setJoiningId(null);
    if (error) {
      if (error.code === "23505") {
        setJoinedClubIds((prev) => new Set(prev).add(clubId));
      } else {
        toast.error(error.message);
      }
      return;
    }
    setJoinedClubIds((prev) => new Set(prev).add(clubId));
  };

  const handleFinish = async () => {
    if (!userId) return;
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", userId);
    navigate("/news", { replace: true });
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();

  const dots = (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`h-2 rounded-full transition-all duration-300 ${
            s === step ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="relative flex min-h-screen items-center justify-center">
      <img
        src={heroImg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md px-4 py-8">
        {dots}

        <div className="rounded-2xl bg-card border border-border/50 shadow-xl min-h-[500px] flex flex-col">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="flex-1 flex flex-col p-6 animate-fade-in">
              <h2 className="text-xl font-bold text-center mb-1">Lengkapi Profil</h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Ceritakan tentang dirimu
              </p>

              {/* Avatar */}
              <div className="flex justify-center mb-6">
                <label className="relative cursor-pointer group">
                  <Avatar className="h-20 w-20 border-2 border-primary/30">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="text-lg bg-secondary">
                      {fullName ? getInitials(fullName) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                  />
                </label>
              </div>

              <div className="space-y-4 flex-1">
                <div>
                  <Label className="text-xs">Nama Lengkap *</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="mt-1 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs">Lokasi / Kota</Label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Jakarta"
                    className="mt-1 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs">Handicap (0-54)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={54}
                    value={handicap}
                    onChange={(e) => setHandicap(e.target.value)}
                    placeholder="24"
                    className="mt-1 rounded-xl"
                  />
                </div>
              </div>

              <Button
                className="w-full mt-6 h-12 rounded-xl text-base font-semibold"
                disabled={!fullName.trim()}
                onClick={handleStep1Next}
              >
                Lanjut <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="flex-1 flex flex-col p-6 animate-fade-in">
              <h2 className="text-xl font-bold text-center mb-1">Bergabung ke Club</h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Pilih club untuk bergabung (opsional)
              </p>

              <div className="flex-1 space-y-3 overflow-y-auto">
                {clubs?.map((club: any) => {
                  const joined = joinedClubIds.has(club.id);
                  const memberCount =
                    club.members?.[0]?.count ?? 0;
                  return (
                    <div
                      key={club.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        joined
                          ? "border-primary/50 bg-primary/5"
                          : "border-border/50"
                      }`}
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={club.logo_url} />
                        <AvatarFallback className="text-xs bg-secondary">
                          {club.name?.[0] ?? "C"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{club.name}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {memberCount} anggota
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={joined ? "secondary" : "default"}
                        className="shrink-0 rounded-lg text-xs h-8"
                        disabled={joined || joiningId === club.id}
                        onClick={() => handleJoinClub(club.id)}
                      >
                        {joined ? (
                          <>
                            <Check className="h-3 w-3 mr-1" /> Joined
                          </>
                        ) : (
                          "Join"
                        )}
                      </Button>
                    </div>
                  );
                })}
                {clubs?.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Belum ada club tersedia
                  </p>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-xl"
                  onClick={() => setStep(3)}
                >
                  Skip
                </Button>
                <Button
                  className="flex-1 h-12 rounded-xl text-base font-semibold"
                  onClick={() => setStep(3)}
                >
                  Lanjut <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
              <h2 className="text-xl font-bold text-center mb-6">
                Siap Bermain! 🏌️
              </h2>

              <Avatar className="h-20 w-20 mb-4 border-2 border-primary/30">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="text-lg bg-secondary">
                  {getInitials(fullName || "?")}
                </AvatarFallback>
              </Avatar>

              <p className="text-lg font-semibold">{fullName}</p>

              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Trophy className="h-4 w-4 text-primary" />
                  HCP {handicap || "Belum diset"}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-primary" />
                  {joinedClubIds.size} club
                </div>
              </div>

              <p className="text-sm text-muted-foreground text-center mt-6 max-w-xs">
                Selamat datang di CloudFairway.
                <br />
                Platform golf komunitas Indonesia.
              </p>

              <Button
                className="w-full mt-8 h-12 rounded-xl text-base font-semibold golf-glow"
                onClick={handleFinish}
              >
                Mulai Bermain
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
