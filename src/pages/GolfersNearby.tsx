import { MessageCircle, MapPin } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const golfers = [
  { name: "Alex Turner", initials: "AT", hcp: 12, distance: "0.5 km" },
  { name: "Lisa Park", initials: "LP", hcp: 8, distance: "1.2 km" },
  { name: "David Kim", initials: "DK", hcp: 18, distance: "2.0 km" },
  { name: "Emma Stone", initials: "ES", hcp: 5, distance: "2.5 km" },
  { name: "Ryan Cole", initials: "RC", hcp: 22, distance: "3.1 km" },
  { name: "Nina Patel", initials: "NP", hcp: 15, distance: "4.0 km" },
];

const GolfersNearby = () => {
  return (
    <div className="bottom-nav-safe p-4">
      <div className="flex items-center gap-2 mb-6">
        <MapPin className="h-5 w-5 text-primary" />
        <h1 className="font-display text-2xl font-bold">Golfers Nearby</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {golfers.map((g, i) => (
          <div
            key={g.name}
            className="golf-card flex flex-col items-center p-5 text-center animate-fade-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <Avatar className="h-16 w-16 border-2 border-primary/40">
              <AvatarFallback className="bg-secondary text-lg font-bold">
                {g.initials}
              </AvatarFallback>
            </Avatar>
            <p className="mt-3 text-sm font-semibold">{g.name}</p>
            <p className="text-xs text-muted-foreground">
              HCP {g.hcp} · {g.distance}
            </p>
            <Button size="sm" className="mt-3 h-8 gap-1.5 rounded-lg text-xs">
              <MessageCircle className="h-3.5 w-3.5" /> Message
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GolfersNearby;
