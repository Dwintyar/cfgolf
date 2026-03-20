import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import AppHeader from "@/components/AppHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserRound, Settings } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const GolfersNearby = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const { data: golfers, isLoading } = useQuery({
    queryKey: ["golfers-nearby"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, location, handicap")
        .not("full_name", "is", null)
        .order("full_name")
        .limit(50);
      return data ?? [];
    },
  });

  const filtered = golfers?.filter(g =>
    !search ||
    g.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    g.location?.toLowerCase().includes(search.toLowerCase())
  ).filter(g => g.id !== currentUserId) ?? [];

  const getInitials = (name: string | null) =>
    name ? name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() : "?";

  return (
    <div className="bottom-nav-safe">
      <AppHeader title="Golfers Nearby" />
      <div className="px-4 pt-2 pb-3">
        <h1 className="font-display text-xl font-bold mb-3">Golfers Nearby</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau lokasi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl bg-secondary border-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 px-4">
        {isLoading && Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center text-center animate-pulse">
            <div className="h-16 w-16 rounded-full bg-secondary" />
            <div className="mt-2 h-3 w-16 rounded bg-secondary" />
          </div>
        ))}
        {filtered.map((g, i) => (
          <div
            key={g.id}
            className="flex flex-col items-center text-center animate-fade-in cursor-pointer"
            style={{ animationDelay: `${i * 50}ms` }}
            onClick={() => navigate(`/profile/${g.id}`)}
          >
            <Avatar className="h-16 w-16 border-2 border-primary/50">
              <AvatarImage src={g.avatar_url ?? undefined} />
              <AvatarFallback className="bg-secondary text-sm font-bold">
                {getInitials(g.full_name)}
              </AvatarFallback>
            </Avatar>
            <p className="mt-2 text-xs font-semibold leading-tight">
              {g.full_name}
            </p>
            <p className="text-[10px] text-muted-foreground">
              HCP {g.handicap ?? "N/A"}
            </p>
            {g.location && (
              <p className="text-[10px] text-muted-foreground/70 truncate max-w-full">
                {g.location}
              </p>
            )}
          </div>
        ))}
        {!isLoading && filtered.length === 0 && (
          <div className="col-span-3 flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <UserRound className="h-8 w-8 text-primary/60" />
            </div>
            <p className="text-lg font-semibold text-foreground">No golfers nearby</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your location or search radius.
            </p>
            <Button variant="outline" className="mt-4 gap-2" onClick={() => navigate("/settings")}>
              <Settings className="h-4 w-4" /> Adjust Settings
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GolfersNearby;
