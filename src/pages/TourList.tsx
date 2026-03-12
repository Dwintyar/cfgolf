import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Trophy, Calendar, Users, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import CreateTourDialog from "@/components/tour/CreateTourDialog";

const TourList = () => {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  const { data: tours, isLoading, refetch } = useQuery({
    queryKey: ["tours"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tours")
        .select("*, clubs!tours_organizer_club_id_fkey(name, logo_url)")
        .order("year", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="bottom-nav-safe">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h1 className="font-display text-2xl font-bold">Tournaments</h1>
        </div>
        <Button size="sm" className="h-8 gap-1" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5" /> New Tour
        </Button>
      </div>

      <div className="space-y-3 px-4">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}

        {!isLoading && tours?.length === 0 && (
          <div className="golf-card p-8 text-center">
            <Trophy className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">No tournaments yet</p>
            <Button size="sm" className="mt-4" onClick={() => setShowCreate(true)}>Create your first tour</Button>
          </div>
        )}

        {tours?.map((tour, i) => (
          <button
            key={tour.id}
            onClick={() => navigate(`/tour/${tour.id}`)}
            className="golf-card w-full text-left p-4 animate-fade-in transition-all hover:border-primary/30"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-base font-semibold truncate">{tour.name}</h3>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {tour.year}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {(tour.clubs as any)?.name ?? "—"}
                  </span>
                </div>
                {tour.description && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{tour.description}</p>
                )}
              </div>
              <Badge variant="outline" className="ml-2 shrink-0 text-[10px] uppercase tracking-wider border-primary/30 text-primary">
                {tour.tournament_type}
              </Badge>
            </div>
          </button>
        ))}
      </div>

      <CreateTourDialog open={showCreate} onOpenChange={setShowCreate} onCreated={() => { setShowCreate(false); refetch(); }} />
    </div>
  );
};

export default TourList;
