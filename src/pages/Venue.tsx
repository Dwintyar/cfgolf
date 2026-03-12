import { ArrowLeft, MapPin, Clock, DollarSign, Star } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import venueImg from "@/assets/golf-venue.jpg";

const Venue = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, course_holes(*)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const totalYards = course?.course_holes?.reduce(
    (sum: number, h: any) => sum + (h.distance_yards ?? 0),
    0
  );

  return (
    <div className="bottom-nav-safe">
      <div className="relative">
        <img
          src={course?.image_url || venueImg}
          alt="Venue"
          className="h-56 w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 rounded-full bg-background/60 p-2 backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4 -mt-6 relative z-10">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold">
              {course?.name ?? "Golf Course"}
            </h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              {course?.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {course.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-accent" /> 4.8
              </span>
            </div>
          </>
        )}

        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: `${course?.holes_count ?? 18} Holes`, icon: "⛳" },
            { label: `Par ${course?.par ?? "—"}`, icon: "🏌️" },
            {
              label: totalYards ? `${totalYards.toLocaleString()} yd` : "— yd",
              icon: "📏",
            },
          ].map((s) => (
            <div key={s.label} className="golf-card p-3 text-center">
              <p className="text-lg">{s.icon}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {course?.green_fee_price && (
          <div className="mt-4 golf-card p-4 flex items-center justify-between">
            <span className="text-sm font-semibold">Green Fee</span>
            <span className="flex items-center text-lg font-bold text-primary">
              <DollarSign className="h-4 w-4" />
              {Number(course.green_fee_price).toFixed(0)}
            </span>
          </div>
        )}

        {course?.course_holes && course.course_holes.length > 0 && (
          <>
            <h2 className="mt-6 mb-3 font-display text-lg font-semibold">
              Hole Details
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {(course.course_holes as any[])
                .sort((a, b) => a.hole_number - b.hole_number)
                .map((hole, i) => (
                  <div
                    key={hole.id}
                    className="golf-card flex items-center justify-between p-3 animate-fade-in"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="text-left">
                      <p className="text-sm font-semibold flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-primary" /> Hole{" "}
                        {hole.hole_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Par {hole.par}
                        {hole.distance_yards ? ` · ${hole.distance_yards} yd` : ""}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}

        <Button className="mt-6 h-12 w-full rounded-xl text-base font-semibold golf-glow">
          Book Tee Time
        </Button>
      </div>
    </div>
  );
};

export default Venue;
