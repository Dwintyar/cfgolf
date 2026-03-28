import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MapPin, Flag, Search, Plus, ChevronRight, Star } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import DesktopLayout from "@/components/DesktopLayout";
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
  const [venueTab, setVenueTab] = useState<"all" | "golf" | "range">("all");
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
        .order("name");
      return data ?? [];
    },
  });

  const { data: myClubIds } = useQuery({
    queryKey: ["my-admin-clubs", userId],
    queryFn: async () => {
      if (!userId) return [];
      const [{ data: memberData }, { data: staffData }] = await Promise.all([
        supabase.from("members").select("club_id").eq("user_id", userId).in("role", ["owner", "admin"]),
        supabase.from("club_staff").select("club_id").eq("user_id", userId).eq("staff_role", "course_admin"),
      ]);
      const clubIds = [
        ...(memberData ?? []).map((m: any) => m.club_id),
        ...(staffData ?? []).map((s: any) => s.club_id),
      ];
      return [...new Set(clubIds)];
    },
    enabled: !!userId,
  });

  const { data: myAdminClubsData } = useQuery({
    queryKey: ["my-admin-clubs-data", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from("members")
        .select("club_id, clubs(id, name, facility_type)")
        .eq("user_id", userId)
        .in("role", ["owner", "admin"]);
      return (data ?? []).map((m: any) => m.clubs).filter(Boolean) as { id: string; name: string; facility_type: string }[];
    },
    enabled: !!userId,
  });

  const searchFiltered = courses?.filter((c) =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.location?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const golfCourses = searchFiltered.filter(
    (c) => (c.clubs as any)?.facility_type !== "driving_range"
  );

  const filteredRanges = drivingRangeClubs?.filter((c: any) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const allCount = searchFiltered.length + filteredRanges.length;
  const isMyCourse = (c: any) => myClubIds?.includes(c.club_id);

  const displayCourses = venueTab === "all" ? searchFiltered : golfCourses;
  const sortedDisplayCourses = [
    ...(displayCourses.filter(isMyCourse)),
    ...(displayCourses.filter(c => !isMyCourse(c))),
  ];

  const formatPrice = (price: number | null) => {
    if (!price) return null;
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(price));
  };

  const eligibleClubs = myAdminClubsData?.filter(club =>
    venueTab === "range"
      ? club.facility_type === "driving_range"
      : club.facility_type !== "driving_range"
  ) ?? [];

  return (
    <DesktopLayout>
      <div className="bottom-nav-safe">
        <AppHeader title="Courses" icon={<MapPin className="h-5 w-5 text-primary" />} />

        {/* Search + Filter */}
        <div className="px-4 pb-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search golf courses, locations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-xl bg-secondary border-none text-sm"
            />
          </div>
          <div className="flex gap-2">
            {[
              { id: "all" as const, label: "All", count: allCount },
              { id: "golf" as const, label: "Golf Course", count: golfCourses.length },
              { id: "range" as const, label: "Driving Range", count: filteredRanges.length },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setVenueTab(t.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  venueTab === t.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
                <span className={`ml-1.5 text-[10px] ${venueTab === t.id ? "opacity-70" : "opacity-50"}`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Golf Courses */}
        {(venueTab === "all" || venueTab === "golf") && (
          <div className="px-4">
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-52 w-full rounded-2xl" />
                ))}
              </div>
            )}

            {!isLoading && sortedDisplayCourses.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <Flag className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="text-base font-semibold">Belum ada golf course terdaftar</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {search ? "Coba kata kunci lain" : "Golf course akan muncul setelah ditambahkan admin"}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedDisplayCourses.map((course, i) => {
                const isOwned = isMyCourse(course);
                const price = formatPrice(course.green_fee_price);
                return (
                  <div
                    key={course.id}
                    className={`group relative rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer
                      hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5
                      ${isOwned
                        ? "border-primary/40 bg-gradient-to-br from-primary/5 to-transparent"
                        : "border-border/60 bg-card hover:border-primary/30"
                      }`}
                    style={{ animationDelay: `${i * 40}ms` }}
                    onClick={() => navigate(`/venue/${course.id}`)}
                  >
                    {/* Image area */}
                    <div className="relative h-36 overflow-hidden bg-secondary">
                      <img
                        src={course.image_url || venueImg}
                        alt={course.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                      {/* Top-left badges */}
                      <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                        {isOwned && (
                          <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow">
                            <Star className="h-2.5 w-2.5" /> My Course
                          </span>
                        )}
                        <span className="rounded-full bg-black/50 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium text-white capitalize">
                          {course.course_type ?? "Championship"}
                        </span>
                      </div>

                      {/* Price top-right */}
                      {price && (
                        <span className="absolute top-2.5 right-2.5 rounded-full bg-primary/90 px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground shadow">
                          {price}
                        </span>
                      )}

                      {/* Holes + Par */}
                      <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2">
                        <span className="rounded-full bg-black/50 backdrop-blur-sm px-2 py-0.5 text-[10px] text-white font-medium">
                          {course.holes_count ?? 18} Holes
                        </span>
                        <span className="rounded-full bg-black/50 backdrop-blur-sm px-2 py-0.5 text-[10px] text-white font-medium">
                          Par {course.par ?? "—"}
                        </span>
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm leading-tight truncate">{course.name}</p>
                          {course.location && (
                            <p className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground truncate">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {course.location}
                            </p>
                          )}
                          {(course.clubs as any)?.name && (
                            <p className="mt-0.5 text-[10px] text-muted-foreground/60 truncate">
                              {(course.clubs as any).name}
                            </p>
                          )}
                        </div>

                        {isOwned ? (
                          <div className="flex flex-col gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                            <Button size="sm" className="h-7 px-3 text-[10px] font-bold"
                              onClick={() => navigate(`/admin/course/${course.id}`)}>
                              Manage
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-3 text-[10px]"
                              onClick={() => navigate(`/venue/${course.id}`)}>
                              View
                            </Button>
                          </div>
                        ) : (
                          <button
                            className="shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors"
                            onClick={e => { e.stopPropagation(); navigate(`/venue/${course.id}`); }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Driving Ranges */}
        {(venueTab === "all" || venueTab === "range") && (
          <div className={`px-4 ${venueTab === "all" && sortedDisplayCourses.length > 0 ? "mt-6" : ""}`}>
            {venueTab === "all" && filteredRanges.length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-border/50" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">Driving Ranges</p>
                <div className="h-px flex-1 bg-border/50" />
              </div>
            )}

            {!loadingRanges && filteredRanges.length === 0 && venueTab === "range" && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <MapPin className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="text-base font-semibold">Belum ada driving range terdaftar</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {search ? "Coba kata kunci lain" : "Driving range akan muncul setelah ditambahkan"}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                ...filteredRanges.filter((c: any) => myClubIds?.includes(c.id)),
                ...filteredRanges.filter((c: any) => !myClubIds?.includes(c.id)),
              ].map((club: any, i: number) => {
                const isOwned = myClubIds?.includes(club.id);
                return (
                  <div
                    key={club.id}
                    className={`group flex items-center gap-4 rounded-2xl border p-4 transition-all duration-200 cursor-pointer
                      hover:shadow-md hover:-translate-y-0.5
                      ${isOwned
                        ? "border-primary/40 bg-gradient-to-br from-primary/5 to-transparent"
                        : "border-border/60 bg-card hover:border-primary/30"
                      }`}
                    style={{ animationDelay: `${i * 40}ms` }}
                    onClick={() => navigate(isOwned ? `/admin/club/${club.id}` : `/clubs/${club.id}`)}
                  >
                    <div className="h-14 w-14 rounded-xl bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                      {club.logo_url
                        ? <img src={club.logo_url} className="h-full w-full object-cover" alt={club.name} />
                        : <span className="text-xl font-bold text-primary/60">{club.name.charAt(0)}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{club.name}</p>
                        {isOwned && (
                          <Badge className="text-[9px] bg-primary/15 text-primary border-primary/30 shrink-0">My Range</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{club.description ?? "Driving Range"}</p>
                      {club.contact_phone && (
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{club.contact_phone}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="h-8" />

        {/* FAB */}
        {eligibleClubs.length > 0 && (
          <div className="fixed bottom-20 right-4 z-50 lg:bottom-6 lg:right-6">
            {eligibleClubs.length === 1 ? (
              <button
                onClick={() => navigate(`/admin/course/new?clubId=${eligibleClubs[0].id}`)}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-5 w-5" />
              </button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors">
                    <Plus className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="mb-2">
                  <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Add course for:</p>
                  {eligibleClubs.map(club => (
                    <DropdownMenuItem key={club.id} onClick={() => navigate(`/admin/course/new?clubId=${club.id}`)}>
                      {club.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>
    </DesktopLayout>
  );
};

export default VenueList;
