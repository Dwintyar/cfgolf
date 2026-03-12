import { useLocation, useNavigate } from "react-router-dom";
import { Newspaper, Users, Trophy, Play, MapPin } from "lucide-react";

const tabs = [
  { path: "/news", label: "Feeds", icon: Newspaper },
  { path: "/play", label: "Buddies", icon: Users },
  { path: "/clubs", label: "Clubs", icon: Trophy },
  { path: "/tour", label: "Events", icon: Play },
  { path: "/venue", label: "Venues", icon: MapPin },
];

const hiddenPaths = ["/login", "/reset-password"];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  if (hiddenPaths.includes(location.pathname)) return null;

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
