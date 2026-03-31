import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, ChevronRight } from "lucide-react";

const ClubTournamentsTab = ({ clubId }: { clubId: string }) => {
  const navigate = useNavigate();

  const { data: tours, isLoading } = useQuery({
    queryKey: ["club-tournaments", clubId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tours")
        .select("id, name, year, tournament_type, clubs(name, logo_url)")
        .eq("organizer_club_id", clubId)
        .order("year", { ascending: false });
      return data ?? [];
    },
    enabled: !!clubId,
  });

  if (isLoading) return (
    <div className="space-y-0 px-4 pt-3">
      {[1,2,3].map(i => (
        <div key={i} className="flex items-center gap-3 py-3 border-b border-border/30">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );

  if (!tours?.length) return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-2 text-muted-foreground">
      <Trophy className="h-10 w-10 opacity-30" />
      <p className="text-sm font-semibold">No tournaments yet</p>
      <p className="text-xs">Tournaments organized by this club will appear here</p>
    </div>
  );

  return (
    <div>
      {tours.map((tour: any) => (
        <button key={tour.id} onClick={() => navigate(`/tour/${tour.id}`)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left border-b border-border/30 last:border-0 hover:bg-secondary/50 transition-colors">
          <Avatar className="h-12 w-12 rounded-2xl shrink-0">
            <AvatarImage src={(tour.clubs as any)?.logo_url ?? ""} />
            <AvatarFallback className="rounded-2xl bg-primary/10 text-sm font-bold text-primary">
              {tour.name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold truncate">{tour.name}</p>
            <p className="text-[13px] text-muted-foreground mt-0.5 capitalize">
              {tour.year} · {tour.tournament_type}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      ))}
    </div>
  );
};

export default ClubTournamentsTab;
