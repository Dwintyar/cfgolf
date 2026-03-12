import { useLocation, useNavigate } from "react-router-dom";
import { Newspaper, Users, Trophy, Play, MapPin } from "lucide-react";

const tabs = [
  { path: "/news", label: "News", icon: Newspaper },
  { path: "/clubs", label: "Clubs", icon: Users },
  { path: "/tournaments", label: "Tour", icon: Trophy },
  { path: "/play", label: "Play", icon: Play },
  { path: "/venue", label: "Venue", icon: MapPin },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname === "/login") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-card/95 backdrop-blur-lg">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {tabs.map(({ path, label, icon: Icon }) => {
          const active = location.pathname.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "golf-glow" : ""}`} />
              <span className="font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
