import { ArrowLeft, MessageCircle, MapPin, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const golfers = [
  { name: "James Harrington", initials: "JH", location: "London, UK", hcp: 12 },
  { name: "Amy Ford", initials: "AF", location: "London, UK", hcp: 8 },
  { name: "Blane Clements", initials: "BC", location: "London, UK", hcp: 18 },
  { name: "Susie Wright", initials: "SW", location: "London, UK", hcp: 5 },
  { name: "Lacey-Mae Howe", initials: "LH", location: "New York City, US", hcp: 22 },
  { name: "Sarah Parmenter", initials: "SP", location: "London, UK", hcp: 15 },
  { name: "Nora Bravo", initials: "NB", location: "New York City, US", hcp: 10 },
  { name: "David Kim", initials: "DK", location: "Chicago, US", hcp: 14 },
  { name: "Sandra Dee", initials: "SD", location: "London, UK", hcp: 20 },
];

const GolfersNearby = () => {
  const navigate = useNavigate();

  return (
    <div className="bottom-nav-safe">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-xl font-bold">Golfers Nearby</h1>
        </div>
        <button className="relative rounded-full bg-secondary p-2">
          <Mail className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">3</span>
        </button>
      </div>

      {/* 3-column grid like reference */}
      <div className="grid grid-cols-3 gap-3 px-4">
        {golfers.map((g, i) => (
          <div
            key={g.name}
            className="flex flex-col items-center text-center animate-fade-in"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <Avatar className="h-16 w-16 border-2 border-primary/50">
              <AvatarFallback className="bg-secondary text-sm font-bold">
                {g.initials}
              </AvatarFallback>
            </Avatar>
            <p className="mt-2 text-xs font-semibold leading-tight">{g.name}</p>
            <p className="text-[10px] text-muted-foreground">{g.location}</p>
            <Button size="sm" className="mt-2 h-7 w-full rounded-lg text-[10px] font-bold uppercase tracking-wider">
              Message
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GolfersNearby;
