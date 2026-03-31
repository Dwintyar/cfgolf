import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ChevronRight, Users } from "lucide-react";

const VenueScheduleTab = ({ clubId }: { clubId: string }) => {
  const navigate = useNavigate();
  const [scheduleTab, setScheduleTab] = useState<"upcoming" | "completed">("upcoming");

  // Get course(s) linked to this venue club
  const { data: courses } = useQuery({
    queryKey: ["venue-courses-list", clubId],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses").select("id, name").eq("club_id", clubId);
      return data ?? [];
    },
    enabled: !!clubId,
  });

  const courseIds = (courses ?? []).map((c: any) => c.id);

  // Events at this venue's courses
  const { data: events, isLoading } = useQuery({
    queryKey: ["venue-schedule", clubId, courseIds.join(",")],
    queryFn: async () => {
      if (!courseIds.length) return [];
      const { data } = await supabase
        .from("events")
        .select(`
          id, name, event_date, status, course_id,
          courses(name),
          tours(name, organizer_club_id, clubs!tours_organizer_club_id_fkey(name, logo_url)),
          contestants(count)
        `)
        .in("course_id", courseIds)
        .order("event_date", { ascending: false });
      return data ?? [];
    },
    enabled: courseIds.length > 0,
  });

  const upcomingEvents = (events ?? []).filter((e: any) =>
    ["scheduled", "ready", "playing"].includes(e.status)
  );
  const completedEvents = (events ?? []).filter((e: any) =>
    e.status === "done"
  );
  const displayEvents = scheduleTab === "upcoming" ? upcomingEvents : completedEvents;

  const statusColor: Record<string, string> = {
    scheduled: "border-blue-400/40 text-blue-400 bg-blue-400/5",
    ready: "border-accent/40 text-accent bg-accent/5",
    playing: "border-green-500/40 text-green-400 bg-green-500/5",
    done: "border-primary/40 text-primary bg-primary/5",
  };

  return (
    <div>
      {/* Sub tabs */}
      <div className="flex border-b border-border/50">
        {[
          { id: "upcoming", label: `Upcoming${upcomingEvents.length ? ` (${upcomingEvents.length})` : ""}` },
          { id: "completed", label: `Completed${completedEvents.length ? ` (${completedEvents.length})` : ""}` },
        ].map(t => (
          <button key={t.id} onClick={() => setScheduleTab(t.id as any)}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
              scheduleTab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Event list */}
      {isLoading ? (
        <div>
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
              <Skeleton className="h-12 w-12 rounded-2xl" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : displayEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-2 text-muted-foreground">
          <Calendar className="h-10 w-10 opacity-30" />
          <p className="text-sm font-semibold">
            {scheduleTab === "upcoming" ? "No upcoming events" : "No completed events"}
          </p>
          <p className="text-xs">Events booked at this venue will appear here</p>
        </div>
      ) : (
        displayEvents.map((event: any) => {
          const organizer = (event.tours as any)?.clubs;
          const playerCount = (event.contestants as any)?.[0]?.count ?? 0;
          return (
            <button key={event.id} onClick={() => navigate(`/event/${event.id}`)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left border-b border-border/30 last:border-0 hover:bg-secondary/50 transition-colors">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                {organizer?.logo_url
                  ? <img src={organizer.logo_url} className="h-full w-full object-cover" />
                  : <Calendar className="h-5 w-5 text-primary/60" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold truncate">{event.name}</p>
                <p className="text-[13px] text-muted-foreground truncate mt-0.5">
                  {event.event_date}
                  {organizer?.name && ` · ${organizer.name}`}
                </p>
                {playerCount > 0 && (
                  <p className="text-[13px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Users className="h-3 w-3" />{playerCount} players
                  </p>
                )}
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 capitalize ${statusColor[event.status] ?? ""}`}>
                {event.status}
              </span>
            </button>
          );
        })
      )}
    </div>
  );
};

export default VenueScheduleTab;
