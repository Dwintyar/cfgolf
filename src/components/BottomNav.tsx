import { useContext, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, Trophy, Flag, User } from "lucide-react";
import { ChatNotifContext } from "@/App";

const tabs = [
  { path: "/lounge", label: "Lounge", icon: Home },
  { path: "/clubs", label: "Clubs", icon: Trophy },
  { path: "/rounds", label: "Rounds", icon: Flag },
  { path: "/profile", label: "Profile", icon: User },
];

const hiddenPaths = ["/login", "/reset-password"];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useContext(ChatNotifContext);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false
  );

  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  if (isDesktop) return null;
  if (hiddenPaths.includes(location.pathname)) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-card/95 backdrop-blur-lg">
      <div className="flex w-full items-stretch py-1.5">
        {tabs.map(({ path, label, icon: Icon }) => {
          const active = location.pathname.startsWith(path);
          const isLounge = path === "/lounge";
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] transition-colors ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-[22px] w-[22px] ${active ? "golf-glow" : ""}`} />
              {/* Chat unread badge on Lounge */}
              {isLounge && unreadCount > 0 && (
                <span className="absolute top-0 right-[22%] flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              <span className="font-medium leading-tight">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
