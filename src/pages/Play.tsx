import { Users, MessageCircle, MapPin } from "lucide-react";
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

  return (
    <div className="bottom-nav-safe p-4">
      <h1 className="font-display text-2xl font-bold mb-6">Play</h1>

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
    </div>
  );
};

export default Play;
