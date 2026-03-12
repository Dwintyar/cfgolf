import { Search, Users, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";

const clubs = [
  { id: 1, name: "Pine Valley Golf Club", initials: "PV", members: 128, location: "Pine Valley, NJ" },
  { id: 2, name: "Augusta Legends", initials: "AL", members: 256, location: "Augusta, GA" },
  { id: 3, name: "Links & Drinks Society", initials: "LD", members: 89, location: "Scottsdale, AZ" },
  { id: 4, name: "Weekend Warriors GC", initials: "WW", members: 342, location: "San Diego, CA" },
  { id: 5, name: "Iron Sharpeners", initials: "IS", members: 67, location: "Miami, FL" },
];

const Clubs = () => {
  const navigate = useNavigate();

  return (
    <div className="bottom-nav-safe">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-2xl font-bold">Clubs</h1>
          <Button size="sm" className="h-8 gap-1 rounded-lg text-xs">
            <Plus className="h-3.5 w-3.5" /> Create
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clubs..."
            className="h-10 rounded-xl border-border/50 bg-card/80 pl-10"
          />
        </div>
      </div>

      <div className="space-y-3 px-4">
        {clubs.map((club, i) => (
          <button
            key={club.id}
            onClick={() => navigate(`/clubs/${club.id}`)}
            className="golf-card flex w-full items-center gap-3 p-4 text-left transition-colors hover:border-primary/30 animate-fade-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <Avatar className="h-12 w-12 border-2 border-primary/30">
              <AvatarFallback className="bg-primary/20 text-sm font-bold text-primary">
                {club.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{club.name}</p>
              <p className="text-xs text-muted-foreground">{club.location}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> {club.members}
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                Join
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Clubs;
