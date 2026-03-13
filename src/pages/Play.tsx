import { Users, MessageCircle, MapPin } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useNavigate } from "react-router-dom";

const playOptions = [
  {
    title: "Find Golfers",
    description: "Connect with players nearby",
    icon: MapPin,
    path: "/play/golfers",
  },
  {
    title: "Messages",
    description: "Chat with your golf buddies",
    icon: MessageCircle,
    path: "/play/messages",
  },
  {
    title: "My Profile",
    description: "View your stats and gallery",
    icon: Users,
    path: "/play/profile",
  },
];

const Play = () => {
  const navigate = useNavigate();

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, location, par, holes_count, image_url, green_fee_price")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="bottom-nav-safe">
      <AppHeader title="Play" />
      <div className="px-4">

      <div className="space-y-3">
        {playOptions.map((opt, i) => (
          <button
            key={opt.path}
            onClick={() => navigate(opt.path)}
            className="golf-card flex w-full items-center gap-4 p-5 text-left transition-colors hover:border-primary/30 animate-fade-in"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <opt.icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-base font-semibold">{opt.title}</p>
              <p className="text-sm text-muted-foreground">{opt.description}</p>
            </div>
          </button>
        ))}
      </div>

      <h2 className="font-display text-lg font-semibold mt-8 mb-3 flex items-center gap-2">
        <Compass className="h-5 w-5 text-primary" /> Courses
      </h2>

      <div className="space-y-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="golf-card p-3">
              <Skeleton className="h-24 w-full rounded-lg mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}

        {courses?.length === 0 && !isLoading && (
          <p className="text-center text-sm text-muted-foreground py-4">
            No courses yet.
          </p>
        )}

        {courses?.map((course, i) => (
          <button
            key={course.id}
            onClick={() => navigate(`/venue/${course.id}`)}
            className="golf-card w-full overflow-hidden text-left transition-colors hover:border-primary/30 animate-fade-in"
            style={{ animationDelay: `${(i + 3) * 80}ms` }}
          >
            <img
              src={course.image_url || venueImg}
              alt={course.name}
              className="h-28 w-full object-cover"
            />
            <div className="p-3">
              <p className="text-sm font-semibold">{course.name}</p>
              <p className="text-xs text-muted-foreground">
                {course.location || "Location TBD"} · Par {course.par ?? "—"} ·{" "}
                {course.holes_count} holes
              </p>
            </div>
          </button>
        ))}
      </div>
      </div>
    </div>
  );
};

export default Play;
