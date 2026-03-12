import { Search, Users, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

const Clubs = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

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

  const filtered = clubs?.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bottom-nav-safe">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-2xl font-bold">Clubs</h1>
          <Button size="sm" className="h-8 gap-1 rounded-lg text-xs">
            <Plus className="h-3.5 w-3.5" /> Create
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clubs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 rounded-xl border-border/50 bg-card/80 pl-10"
          />
        </div>
      </div>

      <div className="space-y-3 px-4">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="golf-card flex items-center gap-3 p-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}

        {filtered?.length === 0 && !isLoading && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No clubs found. Create one to get started!
          </p>
        )}

        {filtered?.map((club, i) => (
          <button
            key={club.id}
            onClick={() => navigate(`/clubs/${club.id}`)}
            className="golf-card flex w-full items-center gap-3 p-4 text-left transition-colors hover:border-primary/30 animate-fade-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <Avatar className="h-12 w-12 border-2 border-primary/30">
              <AvatarFallback className="bg-primary/20 text-sm font-bold text-primary">
                {club.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{club.name}</p>
              <p className="text-xs text-muted-foreground">{club.description || "Golf Club"}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> {club.memberCount}
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                Join
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Clubs;
