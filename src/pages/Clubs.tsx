import { Search, ArrowLeft, Mic } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";

const Clubs = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const { data: clubs, isLoading } = useQuery({
    queryKey: ["clubs"],
    queryFn: async () => {
      const { data: clubsData, error } = await supabase
        .from("clubs")
        .select("*, members(count)")
        .eq("is_personal", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return clubsData.map((c) => ({
        ...c,
        memberCount: (c.members as any)?.[0]?.count ?? 0,
        initials: c.name
          .split(" ")
          .slice(0, 2)
          .map((w: string) => w[0])
          .join("")
          .toUpperCase(),
      }));
    },
  });

  // Fetch user's memberships
  const { data: myMemberships } = useQuery({
    queryKey: ["my-memberships", currentUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("club_id")
        .eq("user_id", currentUserId!);
      if (error) throw error;
      return new Set(data.map((m) => m.club_id));
    },
    enabled: !!currentUserId,
  });

  // Fetch user's pending join requests
  const { data: myPendingRequests } = useQuery({
    queryKey: ["my-pending-requests", currentUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_invitations")
        .select("club_id")
        .eq("invited_user_id", currentUserId!)
        .eq("invited_by", currentUserId!)
        .eq("status", "pending");
      if (error) throw error;
      return new Set(data.map((r) => r.club_id));
    },
    enabled: !!currentUserId,
  });

  const filtered = clubs?.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const getButtonState = (clubId: string) => {
    if (myMemberships?.has(clubId)) return "member";
    if (myPendingRequests?.has(clubId)) return "requested";
    return "join";
  };

  return (
    <div className="bottom-nav-safe">
      <div className="flex items-center gap-2 p-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search any club"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 rounded-xl border-border/50 bg-card/80 pl-10 pr-10"
          />
          <Mic className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div className="space-y-3 px-4">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="golf-card flex items-center gap-4 p-4">
              <Skeleton className="h-20 w-20 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}

        {filtered?.length === 0 && !isLoading && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No clubs found.
          </p>
        )}

        {filtered?.map((club, i) => {
          const state = getButtonState(club.id);
          return (
            <div
              key={club.id}
              className="golf-card flex items-center gap-4 p-4 animate-fade-in cursor-pointer"
              style={{ animationDelay: `${i * 60}ms` }}
              onClick={() => navigate(`/clubs/${club.id}`)}
            >
              <Avatar className="h-20 w-20 rounded-xl border-2 border-primary/20">
                <AvatarImage src={club.logo_url ?? ""} className="rounded-xl object-cover" />
                <AvatarFallback className="rounded-xl bg-primary/10 text-lg font-bold text-primary">
                  {club.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold truncate">{club.name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                  {club.description || "Golf Club"}
                </p>
                {state === "member" ? (
                  <Badge className="mt-2 text-xs bg-primary/10 text-primary border-primary/20">
                    ✓ Member
                  </Badge>
                ) : state === "requested" ? (
                  <Badge variant="secondary" className="mt-2 text-xs">
                    ⏳ Requested
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    className="mt-2 h-8 rounded-lg px-6 text-xs font-bold uppercase tracking-wider"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/clubs/${club.id}`);
                    }}
                  >
                    Join
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Clubs;
