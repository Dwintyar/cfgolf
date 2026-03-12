import { Calendar, MapPin, Users, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/golf-hero.jpg";

const events = [
  {
    id: 1,
    title: "Spring Championship 2026",
    date: "Mar 28-30",
    location: "Pine Valley GC",
    players: 64,
    maxPlayers: 72,
    format: "Stroke Play",
    featured: true,
  },
  {
    id: 2,
    title: "Weekend Scramble",
    date: "Apr 5",
    location: "Sunset Ridge GC",
    players: 24,
    maxPlayers: 32,
    format: "Scramble",
    featured: false,
  },
  {
    id: 3,
    title: "Club Match Play Series",
    date: "Apr 12-14",
    location: "Augusta Legends",
    players: 16,
    maxPlayers: 16,
    format: "Match Play",
    featured: false,
  },
  {
    id: 4,
    title: "Charity Pro-Am",
    date: "May 1",
    location: "Links & Drinks Society",
    players: 40,
    maxPlayers: 60,
    format: "Best Ball",
    featured: false,
  },
];

const Tournaments = () => {
  return (
    <div className="bottom-nav-safe">
      <div className="flex items-center gap-2 p-4">
        <Trophy className="h-5 w-5 text-primary" />
        <h1 className="font-display text-2xl font-bold">Tournaments</h1>
      </div>

      <div className="space-y-4 px-4">
        {events.map((event, i) => (
          <div
            key={event.id}
            className="golf-card overflow-hidden animate-fade-in"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            {event.featured && (
              <img src={heroImg} alt={event.title} className="h-36 w-full object-cover" />
            )}
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-base font-semibold">{event.title}</h3>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {event.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {event.location}
                    </span>
                  </div>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {event.format}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {event.players}/{event.maxPlayers} players
                </div>
                <Button
                  size="sm"
                  className="h-8 rounded-lg text-xs"
                  disabled={event.players >= event.maxPlayers}
                >
                  {event.players >= event.maxPlayers ? "Full" : "Register"}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tournaments;
