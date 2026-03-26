import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Trophy, Users, Share2, UserPlus } from "lucide-react";
import { toast } from "sonner";

const PublicProfile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["public-profile", username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, location, handicap, username")
        .eq("username", username!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!username,
  });

  const { data: stats } = useQuery({
    queryKey: ["public-stats", profile?.id],
    queryFn: async () => {
      const { data: scorecards } = await supabase
        .from("scorecards")
        .select("gross_score, net_score")
        .eq("player_id", profile!.id)
        .gt("gross_score", 0);

      const { data: clubs } = await supabase
        .from("members")
        .select("club_id, clubs(name, logo_url, facility_type)")
        .eq("user_id", profile!.id)
        .limit(4);

      const { data: tournaments } = await supabase
        .from("tour_players")
        .select("tour_id")
        .eq("player_id", profile!.id);

      const rounds = scorecards?.length ?? 0;
      const bestRound =
        rounds > 0
          ? Math.min(...scorecards!.map((s) => s.gross_score ?? 999))
          : null;
      const avgGross =
        rounds > 0
          ? (
              scorecards!.reduce((s, c) => s + (c.gross_score ?? 0), 0) / rounds
            ).toFixed(1)
          : null;

      return {
        rounds,
        bestRound,
        avgGross,
        clubs: clubs ?? [],
        tournaments: tournaments?.length ?? 0,
      };
    },
    enabled: !!profile?.id,
  });

  const handleShare = () => {
    const url = `${window.location.origin}/p/${username}`;
    navigator.clipboard.writeText(url);
    toast.success("Link profil disalin!");
  };

  const handleShareWhatsApp = () => {
    const url = `${window.location.origin}/p/${username}`;
    const text = `Lihat profil golf ${profile?.full_name} di GolfBuana! HCP ${profile?.handicap ?? "N/A"} 🏌️`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`
    );
  };

  const getInitials = (name: string | null) =>
    name
      ? name
          .split(" ")
          .slice(0, 2)
          .map((w) => w[0])
          .join("")
          .toUpperCase()
      : "?";

  if (isLoading)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-80">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-16 w-16 rounded-full mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );

  if (!profile)
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h1 className="text-xl font-bold mb-2">Profil tidak ditemukan</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Username @{username} tidak terdaftar di GolfBuana
        </p>
        <Button onClick={() => navigate("/login")}>Masuk ke GolfBuana</Button>
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/favicon.png"
              alt="GolfBuana"
              className="h-7 w-7 rounded-lg"
            />
            <span className="font-bold text-lg">GolfBuana</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-1" /> Salin Link
            </Button>
            <Button variant="outline" size="sm" onClick={handleShareWhatsApp}>
              💬 WhatsApp
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto pb-20">
        {/* Profile card */}
        <div className="golf-card mx-4 mt-4 overflow-hidden">
          {/* Cover */}
          <div className="h-28 bg-gradient-to-br from-primary/30 to-primary/10 relative">
            <div className="absolute inset-0 bg-[url('/placeholder.svg')] opacity-5" />
          </div>

          <div className="px-5 pb-5">
            <div className="flex items-end justify-between -mt-10 mb-3">
              <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                <AvatarImage src={profile.avatar_url ?? ""} />
                <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => navigate("/login")}
              >
                <UserPlus className="h-4 w-4" /> Follow
              </Button>
            </div>

            <h1 className="text-xl font-bold">{profile.full_name}</h1>
            <p className="text-sm text-muted-foreground">
              @{profile.username}
            </p>

            {profile.location && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3.5 w-3.5" />
                {profile.location}
              </p>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3 mt-4">
              {[
                {
                  label: "Handicap",
                  value: profile.handicap ?? "N/A",
                  highlight: true,
                },
                { label: "Rounds", value: stats?.rounds ?? 0 },
                { label: "Best", value: stats?.bestRound ?? "—" },
                { label: "Tournaments", value: stats?.tournaments ?? 0 },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p
                    className={`text-xl font-bold ${
                      (s as any).highlight ? "text-primary" : ""
                    }`}
                  >
                    {s.value}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Clubs */}
        {stats?.clubs && stats.clubs.length > 0 && (
          <div className="golf-card mx-4 mt-4 p-4">
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" /> Clubs
            </p>
            <div className="space-y-2.5">
              {stats.clubs.map((m: any) => (
                <div key={m.club_id} className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 rounded-lg">
                    <AvatarImage src={(m.clubs as any)?.logo_url ?? ""} />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {((m.clubs as any)?.name ?? "?").charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {(m.clubs as any)?.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground capitalize">
                      {(m.clubs as any)?.facility_type?.replace("_", " ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="golf-card mx-4 mt-4 p-6 text-center">
          <Trophy className="h-10 w-10 text-primary mx-auto mb-3" />
          <h2 className="text-lg font-bold mb-1">Bergabung di GolfBuana</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Platform golf komunitas Indonesia — scorecard digital, tournament,
            handicap, dan koneksi antar golfer.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate("/login")}>
              Masuk
            </Button>
            <Button onClick={() => navigate("/login?tab=register")}>
              Daftar Gratis
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicProfile;
