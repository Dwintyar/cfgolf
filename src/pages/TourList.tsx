import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Trophy, Calendar, Users, Plus } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import CreateTourDialog from "@/components/tour/CreateTourDialog";

const TourList = () => {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "completed" | "invited">("upcoming");

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

  // Load events for the tours
  const { data: events } = useQuery({
    queryKey: ["all-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, courses(name, location)")
        .order("event_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const tabs = [
    { id: "upcoming" as const, label: "Upcoming Events" },
    { id: "completed" as const, label: "Completed" },
  ];

  return (
    <div className="bottom-nav-safe">
      <AppHeader
        title="Events"
        icon={<Trophy className="h-5 w-5 text-primary" />}
      />

      {/* Events section with tabs like reference GD_Mob_62 */}
      <div className="mx-4 golf-card overflow-hidden">
        <div className="flex">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
          {events?.slice(0, 4).map((event, i) => (
            <div
              key={event.id}
              className="flex items-center gap-3 rounded-lg bg-background/50 p-3 animate-fade-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <Avatar className="h-9 w-9 border border-primary/20">
                <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                  {event.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{event.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {event.event_date} · {(event.courses as any)?.name ?? ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 rounded-lg border-primary/30 px-3 text-[10px] font-bold uppercase tracking-wider text-primary"
                onClick={() => navigate(`/event/${event.id}`)}
              >
                View
              </Button>
            </div>
          ))}
          {(!events || events.length === 0) && !isLoading && (
            <p className="text-center text-xs text-muted-foreground py-4">No events yet</p>
          )}
        </div>
      </div>

      {/* Tours section with tabs like reference bottom section */}
      <div className="mt-6 px-4">
        <div className="flex items-center gap-3 mb-3">
          {["invited", "completed"].map((t) => (
            <button
              key={t}
              className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                tab === t ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
          <button
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
            onClick={() => setShowCreate(true)}
          >
            Create
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          {isLoading && Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}

          {tours?.map((tour, i) => (
            <button
              key={tour.id}
              onClick={() => navigate(`/tour/${tour.id}`)}
              className="flex w-full items-center gap-3 rounded-xl py-3 text-left animate-fade-in transition-colors"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarImage src={(tour.clubs as any)?.logo_url ?? ""} />
                <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                  {tour.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{tour.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {tour.year} · {(tour.clubs as any)?.name ?? "—"}
                </p>
              </div>
              <Button
                size="sm"
                className="h-7 rounded-lg px-4 text-[10px] font-bold uppercase tracking-wider"
              >
                Register
              </Button>
            </button>
          ))}
        </div>
      </div>

      <CreateTourDialog open={showCreate} onOpenChange={setShowCreate} onCreated={() => { setShowCreate(false); refetch(); }} />
    </div>
  );
};

export default TourList;
