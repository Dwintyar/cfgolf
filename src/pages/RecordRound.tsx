import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Search, MapPin, Flag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const RecordRound = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses-for-round"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, name, location, par, holes_count")
        .order("name");
      return data ?? [];
    },
  });

  const filtered = courses?.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.location?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="bottom-nav-safe">
      <div className="border-b border-border/50 p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Record Round</h1>
            <p className="text-xs text-muted-foreground">Select a course to start</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl bg-secondary border-none"
          />
        </div>
      </div>

      <div className="px-4 space-y-2 pb-4">
        {isLoading && Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}

        {filtered.map((c, i) => (
          <button
            key={c.id}
            onClick={() => navigate(`/record-round/${c.id}`)}
            className="golf-card w-full flex items-center gap-3 p-3.5 text-left hover:bg-secondary/30 transition-colors animate-fade-in"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Flag className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{c.name}</p>
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                {c.location && <><MapPin className="h-3 w-3" />{c.location} · </>}
                Par {c.par ?? "N/A"} · {c.holes_count} holes
              </p>
            </div>
          </button>
        ))}

        {!isLoading && filtered.length === 0 && (
          <div className="py-12 text-center">
            <Flag className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">No courses found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordRound;
