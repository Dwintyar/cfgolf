import { ArrowLeft, MapPin, Star, Wifi, Clock, Ship } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import venueImg from "@/assets/golf-venue.jpg";
import heroImg from "@/assets/golf-hero.jpg";
import { useState, useMemo } from "react";

const Venue = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [selectedTime, setSelectedTime] = useState("07:00");
  const [distUnit, setDistUnit] = useState<"yd" | "m">("m");

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, course_holes(*), course_tees(*)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: slotConfig } = useQuery({
    queryKey: ["tee-slot-config-public", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tee_time_slots")
        .select("*")
        .eq("course_id", id!)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const teeTimes = useMemo(() => {
    if (!slotConfig) return ["07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "13:00", "14:00", "15:00"];
    const slots: string[] = [];
    const [sh, sm] = slotConfig.start_time.split(":").map(Number);
    const [eh, em] = slotConfig.end_time.split(":").map(Number);
    let mins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    while (mins <= endMins) {
      const h = Math.floor(mins / 60).toString().padStart(2, "0");
      const m = (mins % 60).toString().padStart(2, "0");
      slots.push(`${h}:${m}`);
      mins += slotConfig.interval_mins;
    }
    return slots;
  }, [slotConfig]);

  const convertDist = (yards: number | null) => {
    if (!yards) return "—";
    if (distUnit === "m") return Math.round(yards * 0.9144).toLocaleString();
    return yards.toLocaleString();
  };

  const totalYards = course?.course_holes?.reduce(
    (sum: number, h: any) => sum + (h.distance_yards ?? 0),
    0
  ) ?? 0;

  const formatPrice = (price: number | null) => {
    if (!price) return null;
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(price));
  };

  const price = course?.green_fee_price ? formatPrice(Number(course.green_fee_price)) : null;

  return (
    <div className="bottom-nav-safe">
      {/* Hero image with overlay info like reference GD_Mob_61 */}
      <div className="relative">
        <img
          src={course?.image_url || venueImg}
          alt="Venue"
          className="h-56 w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 rounded-full bg-background/60 p-2 backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Course info overlay at bottom of hero */}
        <div className="absolute bottom-4 left-4 right-4">
          {!isLoading && (
            <>
              <h1 className="font-display text-2xl font-bold drop-shadow-lg">
                {course?.name ?? "Golf Course"}
              </h1>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4].map((s) => (
                    <Star key={s} className="h-3 w-3 fill-accent text-accent" />
                  ))}
                  <Star className="h-3 w-3 text-accent/40" />
                </div>
                {course?.location && (
                  <span className="flex items-center gap-1 text-xs text-foreground/80">
                    <MapPin className="h-3 w-3" /> {course.location}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="px-4 pt-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <>
            {/* Price + Tips row like reference */}
            <div className="flex gap-4">
              <div>
                {price && (
                  <p className="text-3xl font-bold text-primary">{price}</p>
                )}
                <Badge variant="outline" className="mt-2 border-primary/30 text-xs uppercase tracking-wider">
                  {new Date().toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })}
                </Badge>
              </div>
              <div className="flex-1 space-y-1.5">
                <p className="text-sm font-semibold">Tips</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Wifi className="h-3.5 w-3.5 text-primary" /> WiFi tersedia
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Ship className="h-3.5 w-3.5 text-primary" /> Cart tersedia
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Lebih sepi sebelum jam 12
                </div>
              </div>
              {/* Favorite button */}
              <button className="self-start flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                <Star className="h-5 w-5 fill-current" />
              </button>
            </div>

            {/* Distance unit toggle */}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm font-semibold">
                {course?.holes_count ?? 18} Holes · Par {course?.par ?? "—"} · {convertDist(totalYards)} {distUnit}
              </p>
              <div className="flex rounded-lg border border-border/50 overflow-hidden">
                <button
                  onClick={() => setDistUnit("yd")}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${distUnit === "yd" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
                >
                  Yard
                </button>
                <button
                  onClick={() => setDistUnit("m")}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${distUnit === "m" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
                >
                  Meter
                </button>
              </div>
            </div>

            {/* Course Tees */}
            {course?.course_tees && (course.course_tees as any[]).length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-semibold mb-3">Tee Options</p>
                <div className="grid grid-cols-2 gap-2">
                  {(course.course_tees as any[]).map((tee: any) => (
                    <div key={tee.id} className="golf-card p-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full border border-border"
                          style={{ backgroundColor: tee.color === "white" ? "#f0f0f0" : tee.color }}
                        />
                        <span className="text-sm font-semibold">{tee.tee_name}</span>
                      </div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        Rating {tee.rating ?? "—"} · Slope {tee.slope ?? "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tee time selection */}
            <div className="mt-6">
              <p className="text-sm font-semibold mb-3">Pilih waktu tee-off</p>
              <div className="grid grid-cols-3 gap-2">
                {teeTimes.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`rounded-xl py-2.5 text-sm font-medium transition-all ${
                      selectedTime === time
                        ? "bg-primary text-primary-foreground golf-glow"
                        : "golf-card hover:border-primary/30"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            {/* Hole Details */}
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
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <div>
                          <p className="text-sm font-semibold">Hole {hole.hole_number}</p>
                          <p className="text-xs text-muted-foreground">
                            Par {hole.par}
                            {hole.distance_yards ? ` · ${convertDist(hole.distance_yards)} ${distUnit}` : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </>
            )}

            {/* Gallery strip like reference */}
            <div className="mt-6 flex gap-1.5 overflow-x-auto pb-2 -mx-4 px-4">
              {[venueImg, heroImg, venueImg, heroImg].map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Gallery ${i + 1}`}
                  className="h-20 w-24 flex-shrink-0 rounded-lg object-cover"
                />
              ))}
            </div>


          </>
        )}
      </div>
    </div>
  );
};

export default Venue;
