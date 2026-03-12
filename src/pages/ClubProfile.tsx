import { ArrowLeft, Users, UserPlus, Settings, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/golf-hero.jpg";

const members = [
  { name: "James Walker", initials: "JW", role: "Admin", hcp: 10 },
  { name: "Sarah Chen", initials: "SC", role: "Member", hcp: 8 },
  { name: "Mike O'Brien", initials: "MO", role: "Member", hcp: 15 },
  { name: "Emma Stone", initials: "ES", role: "Captain", hcp: 5 },
  { name: "Ryan Cole", initials: "RC", role: "Member", hcp: 22 },
];

const ClubProfile = () => {
  const navigate = useNavigate();

  return (
    <div className="bottom-nav-safe">
      <div className="relative">
        <img src={heroImg} alt="Club" className="h-48 w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 rounded-full bg-background/60 p-2 backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4 -mt-8 relative z-10">
        <div className="flex items-end gap-4">
          <Avatar className="h-16 w-16 border-4 border-background">
            <AvatarFallback className="bg-primary text-xl font-bold text-primary-foreground">
              PV
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold">Pine Valley Golf Club</h1>
            <p className="text-xs text-muted-foreground">Pine Valley, NJ · 128 members</p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button className="flex-1 h-10 rounded-xl gap-1.5 text-sm">
            <UserPlus className="h-4 w-4" /> Invite
          </Button>
          <Button variant="secondary" className="h-10 rounded-xl px-4">
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { label: "Members", value: "128", icon: Users },
            { label: "Events", value: "12", icon: Trophy },
            { label: "Avg HCP", value: "14.2", icon: Trophy },
          ].map((s) => (
            <div key={s.label} className="golf-card p-3 text-center">
              <p className="text-lg font-bold text-primary">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-6 mb-3 font-display text-lg font-semibold">Members</h2>
        <div className="space-y-2">
          {members.map((m, i) => (
            <div
              key={m.name}
              className="golf-card flex items-center gap-3 p-3 animate-fade-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <Avatar className="h-10 w-10 border border-primary/20">
                <AvatarFallback className="bg-secondary text-sm font-semibold">
                  {m.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-semibold">{m.name}</p>
                <p className="text-xs text-muted-foreground">HCP {m.hcp}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                m.role === "Admin"
                  ? "bg-accent/20 text-accent"
                  : m.role === "Captain"
                  ? "bg-primary/20 text-primary"
                  : "bg-secondary text-secondary-foreground"
              }`}>
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClubProfile;
