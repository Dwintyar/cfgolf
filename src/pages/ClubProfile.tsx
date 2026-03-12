import { ArrowLeft, Search, UserPlus, Mail, Mic } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

const ClubProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [search, setSearch] = useState("");

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
        .select("*, profiles(full_name, avatar_url, handicap, location)")
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

  const getInitials = (name: string | null) =>
    name
      ? name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
      : "??";

  const filteredMembers = members?.filter((m) => {
    const name = (m.profiles as any)?.full_name ?? "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  // Random status for demo
  const statuses = ["Pending Request", "No Request"];

  return (
    <div className="bottom-nav-safe">
      {/* Header with back + club logo top-right like reference GD_Mob_51 */}
      <div className="flex items-center justify-between p-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar className="h-12 w-12 border-2 border-primary/30">
          <AvatarImage src={club?.logo_url ?? ""} />
          <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="px-4">
        {clubLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <div className="mb-4">
            <h1 className="font-display text-xl font-bold">{club?.name}</h1>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {club?.description || "Golf Club"}
            </p>
          </div>
        )}

        {/* Search members like reference */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Type a name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 rounded-xl border-border/50 bg-card/80 pl-10 pr-10"
          />
          <Mic className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>

        {/* Members list like reference */}
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

          {filteredMembers?.map((m, i) => {
            const profile = m.profiles as any;
            const status = statuses[i % statuses.length];
            const isPending = status === "Pending Request";
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 py-3 animate-fade-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <Avatar className="h-10 w-10 border-2 border-primary/30">
                  <AvatarImage src={profile?.avatar_url ?? ""} />
                  <AvatarFallback className="bg-secondary text-sm font-semibold">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{profile?.full_name || "Golfer"}</p>
                  <p className={`text-xs ${isPending ? "text-primary" : "text-muted-foreground"}`}>
                    {status}
                  </p>
                </div>
                <button className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                  {isPending ? <UserPlus className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ClubProfile;
