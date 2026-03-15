import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MapPin, Flag, Search, DollarSign } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import venueImg from "@/assets/golf-venue.jpg";
import { useState } from "react";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Golf Course", value: "championship" },
  { label: "Executive", value: "executive" },
  { label: "Links", value: "links" },
];

const VenueList = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

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

  const filtered = courses?.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.location?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || c.course_type === filter;
    return matchSearch && matchFilter;
  });

  const formatPrice = (price: number | null) => {
    if (!price) return null;
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(price));
  };

  return (
    <div className="bottom-nav-safe">
      <AppHeader title="Venues" icon={<MapPin className="h-5 w-5 text-primary" />} />

      {/* Search */}
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

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-none">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3 px-4">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}

        {!isLoading && filtered?.length === 0 && (
          <div className="golf-card p-8 text-center">
            <MapPin className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">No venues found</p>
          </div>
        )}

        {filtered?.map((course, i) => (
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
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-base font-semibold truncate flex-1">
                  {course.name}
                </h3>
                {course.green_fee_price && (
                  <Badge variant="outline" className="text-[10px] shrink-0 border-primary/30 text-primary">
                    {formatPrice(course.green_fee_price)}
                  </Badge>
                )}
              </div>
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
              {(course.clubs as any)?.name && (
                <p className="mt-1 text-[10px] text-muted-foreground/70">
                  {(course.clubs as any).name}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default VenueList;
