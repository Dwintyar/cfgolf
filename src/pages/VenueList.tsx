import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MapPin, Flag, Search, Plus } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import venueImg from "@/assets/golf-venue.jpg";
import { useState, useEffect } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const VenueList = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [venueTab, setVenueTab] = useState<"golf" | "range">("golf");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, location, par, holes_count, image_url, green_fee_price, course_type, club_id, clubs(name, facility_type)")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: drivingRangeClubs, isLoading: loadingRanges } = useQuery({
    queryKey: ["driving-ranges"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clubs")
        .select("id, name, description, logo_url, contact_phone, contact_email")
        .eq("facility_type", "driving_range")
        .eq("is_personal", false)
        .order("name");
      return data ?? [];
    },
  });

  const { data: myClubIds } = useQuery({
    queryKey: ["my-admin-clubs", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from("members")
        .select("club_id")
        .eq("user_id", userId)
        .in("role", ["owner", "admin"]);
      return [...new Set((data ?? []).map(m => m.club_id))];
    },
    enabled: !!userId,
  });

  const { data: myClubsWithoutCourse } = useQuery({
    queryKey: ["my-clubs-without-course", myClubIds],
    queryFn: async () => {
      if (!myClubIds?.length) return [];
      const { data: clubsWithCourse } = await supabase
        .from("courses")
        .select("club_id")
        .in("club_id", myClubIds);
      const hasCourse = new Set((clubsWithCourse ?? []).map(c => c.club_id));
      if (hasCourse.size === myClubIds.length) return [];
      const missingIds = myClubIds.filter(id => !hasCourse.has(id));
      const { data: clubs } = await supabase
        .from("clubs")
        .select("id, name, facility_type")
        .in("id", missingIds);
      return clubs ?? [];
    },
    enabled: !!myClubIds?.length,
  });

  const searchFiltered = courses?.filter((c) =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.location?.toLowerCase().includes(search.toLowerCase())
  );

  const golfCourses = searchFiltered?.filter(
    (c) =>
      (c as any).facility_type !== "driving_range" &&
      (c.clubs as any)?.facility_type !== "driving_range"
  ) ?? [];

  const filteredRanges = drivingRangeClubs?.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const isMyCourse = (c: any) => myClubIds?.includes(c.club_id);

  const sortedGolfCourses = [
    ...(golfCourses.filter(isMyCourse)),
    ...(golfCourses.filter(c => !isMyCourse(c))),
  ];

  const formatPrice = (price: number | null) => {
    if (!price) return null;
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(price));
  };

  const addCourseClubs = myClubsWithoutCourse?.filter(club =>
    club.facility_type !== "driving_range"
  ) ?? [];

  return (
    <div className="bottom-nav-safe">
      <AppHeader title="Venues" icon={<MapPin className="h-5 w-5 text-primary" />} />

      <div className="px-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search venues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl bg-secondary border-none"
          />
        </div>
      </div>

      <div className="flex mx-4 mb-3 rounded-xl overflow-hidden border border-border/50">
        {[
          { id: "golf" as const, label: "Golf Courses", count: golfCourses.length },
          { id: "range" as const, label: "Driving Ranges", count: filteredRanges.length },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setVenueTab(t.id)}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              venueTab === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Golf Courses Tab */}
      {venueTab === "golf" && (
        <div className="space-y-3 px-4">
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}

          {!isLoading && sortedGolfCourses.length === 0 && addCourseClubs.length === 0 && (
            <div className="golf-card p-8 text-center">
              <MapPin className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">No venues found</p>
            </div>
          )}

          {sortedGolfCourses.map((course, i) => {
            const isOwned = isMyCourse(course);
            return (
              <div
                key={course.id}
                className={`golf-card flex items-center gap-4 p-4 animate-fade-in transition-all ${
                  isOwned ? "border-primary/40 bg-primary/5" : ""
                }`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                  <img src={course.image_url || venueImg} alt={course.name} className="h-full w-full rounded-xl object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{course.name}</p>
                    {isOwned && (
                      <Badge className="text-[9px] bg-primary/15 text-primary border-primary/30 shrink-0">My Course</Badge>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {course.location && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {course.location}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Flag className="h-3 w-3" /> {course.holes_count} holes · Par {course.par ?? "—"}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[9px] capitalize">{course.course_type ?? "golf course"}</Badge>
                    {course.green_fee_price && (
                      <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">{formatPrice(course.green_fee_price)}</Badge>
                    )}
                  </div>
                  {(course.clubs as any)?.name && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground/70">{(course.clubs as any).name}</p>
                  )}
                </div>
                {isOwned ? (
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button size="sm" className="h-7 px-3 text-[10px] font-bold" onClick={() => navigate(`/admin/course/${course.id}`)}>Manage</Button>
                    <Button size="sm" variant="outline" className="h-7 px-3 text-[10px]" onClick={() => navigate(`/venue/${course.id}`)}>View</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 px-3 text-[10px] shrink-0" onClick={() => navigate(`/venue/${course.id}`)}>View</Button>
                )}
              </div>
            );
          })}

        </div>
      )}

      {/* Driving Ranges Tab */}
      {venueTab === "range" && (
        <div className="space-y-3 px-4">
          {loadingRanges &&
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}

          {/* Owned driving ranges */}
          {filteredRanges
            .filter(c => myClubIds?.includes(c.id))
            .map(club => (
              <div key={club.id} className="golf-card flex items-center gap-4 p-4 border-primary/40 bg-primary/5">
                <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {club.logo_url
                    ? <img src={club.logo_url} className="h-full w-full rounded-xl object-cover" alt={club.name} />
                    : <span className="text-2xl font-bold text-primary">{club.name.charAt(0)}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{club.name}</p>
                    <Badge className="text-[9px] bg-primary/15 text-primary border-primary/30 shrink-0">My Range</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{club.description ?? "Driving Range"}</p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button size="sm" className="h-7 px-3 text-[10px] font-bold" onClick={() => navigate(`/admin/club/${club.id}`)}>Manage</Button>
                </div>
              </div>
            ))
          }

          {/* Other driving ranges */}
          {filteredRanges
            .filter(c => !myClubIds?.includes(c.id))
            .map((club, i) => (
              <div key={club.id} className="golf-card flex items-center gap-4 p-4 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="h-16 w-16 rounded-xl bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                  {club.logo_url
                    ? <img src={club.logo_url} className="h-full w-full rounded-xl object-cover" alt={club.name} />
                    : <span className="text-2xl font-bold text-muted-foreground">{club.name.charAt(0)}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{club.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{club.description ?? "Driving Range"}</p>
                  {club.contact_phone && (
                    <p className="text-[10px] text-muted-foreground/70">{club.contact_phone}</p>
                  )}
                </div>
                <Button size="sm" variant="outline" className="h-7 px-3 text-[10px] shrink-0" onClick={() => navigate(`/clubs/${club.id}`)}>View</Button>
              </div>
            ))
          }

          {!loadingRanges && filteredRanges.length === 0 && (
            <div className="golf-card p-8 text-center">
              <MapPin className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                {search ? "No driving ranges found" : "No driving ranges yet"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VenueList;
