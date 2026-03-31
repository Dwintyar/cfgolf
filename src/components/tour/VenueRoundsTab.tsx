import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Skeleton } from "@/components/ui/skeleton";
import { Flag, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const VenueRoundsTab = ({ clubId }: { clubId: string }) => {
  const navigate = useNavigate();

  // Get all courses owned by this venue club
  const { data: events, isLoading } = useQuery({
    queryKey: ["venue-rounds", clubId],
    queryFn: async () => {
      // First get courses linked to this club
      const { data: courses } = await supabase
        .from("courses")
        .select("id, name")
        .eq("club_id", clubId);

      if (!courses?.length) return [];
      const courseIds = courses.map(c => c.id);

      // Get events at these courses
      const { data: events } = await supabase
        .from("events")
        .select("id, name, event_date, status, course_id, courses(name, image_url), tours(name, clubs!tours_organizer_club_id_fkey(name, logo_url))")
        .in("course_id", courseIds)
        .order("event_date", { ascending: false });

      return events ?? [];
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

  if (!events?.length) return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-2 text-muted-foreground">
      <Flag className="h-10 w-10 opacity-30" />
      <p className="text-sm font-semibold">No rounds yet</p>
      <p className="text-xs">Tournament events held at this venue will appear here</p>
    </div>
  );

  return (
    <div>
      {events.map((event: any) => {
        const organizer = (event.tours as any)?.clubs;
        return (
          <button key={event.id} onClick={() => navigate(`/event/${event.id}`)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left border-b border-border/30 last:border-0 hover:bg-secondary/50 transition-colors">
            <Avatar className="h-12 w-12 rounded-2xl shrink-0">
              <AvatarImage src={(event.courses as any)?.image_url ?? ""} />
              <AvatarFallback className="rounded-2xl bg-primary/10 text-sm font-bold text-primary">
                {event.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold truncate">{event.name}</p>
              <p className="text-[13px] text-muted-foreground truncate mt-0.5">
                {event.event_date} · {organizer?.name ?? (event.tours as any)?.name ?? "—"}
              </p>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
              event.status === "playing" ? "border-green-500/40 text-green-400 bg-green-500/5" :
              event.status === "done" ? "border-primary/40 text-primary bg-primary/5" :
              "border-blue-400/40 text-blue-400 bg-blue-400/5"
            }`}>{event.status}</span>
          </button>
        );
      })}
    </div>
  );
};

export default VenueRoundsTab;
