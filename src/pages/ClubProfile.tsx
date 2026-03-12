import { ArrowLeft, Users, UserPlus, Settings, Trophy } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import heroImg from "@/assets/golf-hero.jpg";

const ClubProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

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

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["club-members", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*, profiles(full_name, avatar_url, handicap)")
        .eq("club_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const initials = club?.name
    ?.split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase() ?? "??";

  const memberCount = members?.length ?? 0;
  const avgHcp = members?.length
    ? (
        members.reduce((sum, m) => sum + ((m.profiles as any)?.handicap ?? 0), 0) /
        members.length
      ).toFixed(1)
    : "—";

  const getInitials = (name: string | null) =>
    name
      ? name
          .split(" ")
          .slice(0, 2)
          .map((w) => w[0])
          .join("")
          .toUpperCase()
      : "??";

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "admin":
      case "owner":
        return "bg-accent/20 text-accent";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <div className="bottom-nav-safe">
      <div className="relative">
        <img
          src={club?.cover_url || heroImg}
          alt="Club"
          className="h-48 w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 rounded-full bg-background/60 p-2 backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4 -mt-8 relative z-10">
        {clubLoading ? (
          <div className="flex items-end gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ) : (
          <div className="flex items-end gap-4">
            <Avatar className="h-16 w-16 border-4 border-background">
              <AvatarFallback className="bg-primary text-xl font-bold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="font-display text-xl font-bold">{club?.name}</h1>
              <p className="text-xs text-muted-foreground">
                {club?.description || "Golf Club"} · {memberCount} members
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button className="flex-1 h-10 rounded-xl gap-1.5 text-sm">
            <UserPlus className="h-4 w-4" /> Invite
          </Button>
          <Button variant="secondary" className="h-10 rounded-xl px-4">
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { label: "Members", value: String(memberCount), icon: Users },
            { label: "Events", value: "—", icon: Trophy },
            { label: "Avg HCP", value: avgHcp, icon: Trophy },
          ].map((s) => (
            <div key={s.label} className="golf-card p-3 text-center">
              <p className="text-lg font-bold text-primary">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-6 mb-3 font-display text-lg font-semibold">Members</h2>
        <div className="space-y-2">
          {membersLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="golf-card flex items-center gap-3 p-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}

          {members?.length === 0 && !membersLoading && (
            <p className="text-center text-sm text-muted-foreground py-4">
              No members yet. Invite golfers to join!
            </p>
          )}

          {members?.map((m, i) => {
            const profile = m.profiles as any;
            return (
              <div
                key={m.id}
                className="golf-card flex items-center gap-3 p-3 animate-fade-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <Avatar className="h-10 w-10 border border-primary/20">
                  <AvatarFallback className="bg-secondary text-sm font-semibold">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{profile?.full_name || "Golfer"}</p>
                  <p className="text-xs text-muted-foreground">
                    HCP {profile?.handicap ?? "—"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getRoleBadgeClass(m.role)}`}
                >
                  {m.role}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ClubProfile;
