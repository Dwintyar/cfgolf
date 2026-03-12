import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MapPin, Flag } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import venueImg from "@/assets/golf-venue.jpg";

const VenueList = () => {
  const navigate = useNavigate();

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, location, par, holes_count, image_url, green_fee_price")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="bottom-nav-safe">
      <AppHeader title="Venues" icon={<MapPin className="h-5 w-5 text-primary" />} />

      <div className="space-y-3 px-4">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}

        {!isLoading && courses?.length === 0 && (
          <div className="golf-card p-8 text-center">
            <MapPin className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">No venues found</p>
          </div>
        )}

        {courses?.map((course, i) => (
          <button
            key={course.id}
            onClick={() => navigate(`/venue/${course.id}`)}
            className="golf-card w-full text-left overflow-hidden animate-fade-in transition-all hover:border-primary/30"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <img
              src={course.image_url || venueImg}
              alt={course.name}
              className="h-28 w-full object-cover"
              loading="lazy"
            />
            <div className="p-3">
              <h3 className="font-display text-base font-semibold truncate">
                {course.name}
              </h3>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {course.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {course.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Flag className="h-3 w-3" /> {course.holes_count} holes · Par{" "}
                  {course.par ?? "—"}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default VenueList;
