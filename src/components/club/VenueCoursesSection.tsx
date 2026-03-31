import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight } from "lucide-react";

const VenueCoursesSection = ({ clubId, navigate }: { clubId: string; navigate: (path: string) => void }) => {
  const { data: courses, isLoading } = useQuery({
    queryKey: ["venue-owned-courses", clubId],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, name, location, image_url, holes_count, par, course_type, green_fee_price")
        .eq("club_id", clubId)
        .order("name");
return data ?? [];
    },
    enabled: !!clubId,
  });

  if (isLoading) return (
    <div>
      {[1,2].map(i => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
          <Skeleton className="h-16 w-16 rounded-xl shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );

  if (!courses?.length) return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-2 text-muted-foreground px-4">
      <span className="text-4xl">⛳</span>
      <p className="text-sm font-semibold">No courses yet</p>
      <p className="text-xs">Golf courses managed by this venue will appear here</p>

    </div>
  );

  return (
    <div>
      {courses.map((course: any) => (
        <button key={course.id}
          onClick={() => { window.location.href = `/venue/${course.id}?embedded=1&from=clubs&clubId=${clubId}`; }}
          className="flex w-full items-center gap-3 px-4 py-3 border-b border-border/30 last:border-0 hover:bg-secondary/50 transition-colors text-left">
          {/* Course image */}
          <div className="h-16 w-16 rounded-xl overflow-hidden shrink-0 bg-primary/10">
            {course.image_url
              ? <img src={course.image_url} className="h-full w-full object-cover" alt={course.name} />
              : <div className="h-full w-full flex items-center justify-center text-2xl">⛳</div>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold truncate">{course.name}</p>
            <p className="text-[13px] text-muted-foreground truncate mt-0.5">
              {course.location ?? "—"}
            </p>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {course.holes_count ?? 18} holes · Par {course.par ?? 72}
              {course.green_fee_price && ` · Rp ${Number(course.green_fee_price).toLocaleString("id-ID")}`}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      ))}
    </div>
  );
};

export default VenueCoursesSection;
