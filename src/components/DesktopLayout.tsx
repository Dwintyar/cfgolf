import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useContext } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatNotifContext } from "@/App";
import {
  Newspaper, Users, Trophy, MapPin,
  Bell, MessageCircle, Settings,
  Building2, Search, Play
} from "lucide-react";
import logo from "@/assets/logo.svg";

const useWindowWidth = () => {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 0
  );
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
};

const DesktopLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useContext(ChatNotifContext);
  const [userId, setUserId] = useState<string | null>(null);
  const width = useWindowWidth();
  const isDesktop = width >= 1024;
  const isWide = width >= 1280;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const { data: profile } = useQuery({
    queryKey: ["desktop-profile", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, handicap")
        .eq("id", userId!)
        .single();
      return data;
    },
    enabled: !!userId,
  });

  const navItems = [
    { path: "/news", label: "Feeds", icon: Newspaper },
    { path: "/play", label: "Buddies", icon: Users },
    { path: "/clubs", label: "Clubs", icon: Building2 },
    { path: "/tour", label: "Events", icon: Trophy },
    { path: "/venue", label: "Venues", icon: MapPin },
  ];

  const getInitials = (name: string | null) =>
    name ? name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() : "?";

  // Mobile: render children only
  if (!isDesktop) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* SIDEBAR KIRI */}
      <aside
        style={{ width: 256 }}
        className="fixed left-0 top-0 h-screen border-r border-border/50 bg-card z-40 p-4 flex flex-col overflow-y-auto"
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-6 px-2">
          <img src={logo} alt="CFGolf" className="h-8 w-8 rounded-lg object-contain" />
          <span className="font-display text-xl font-bold text-foreground">CFGolf</span>
        </div>

        {/* Profile card mini */}
        {profile && (
          <div
            className="golf-card p-3 mb-4 cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => navigate("/profile")}
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarImage src={profile.avatar_url ?? ""} />
                <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate text-foreground">
                  {profile.full_name ?? "Golfer"}
                </p>
                <p className="text-xs text-muted-foreground">
                  HCP {profile.handicap ?? "N/A"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = location.pathname.startsWith(path);
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="space-y-1 mt-4 pt-4 border-t border-border/50">
          {[
            { icon: Bell, label: "Notifications", path: "/notifications" },
            { icon: MessageCircle, label: "Messages", path: "/chat", badge: unreadCount },
            { icon: Settings, label: "Settings", path: "/settings" },
          ].map(({ icon: Icon, label, path, badge }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm transition-colors text-left ${
                location.pathname.startsWith(path)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {badge && badge > 0 ? (
                <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                  {badge > 9 ? "9+" : badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main
        style={{
          marginLeft: 256,
          marginRight: isWide ? 288 : 0,
          minHeight: "100vh",
        }}
      >
        <div style={{ maxWidth: 680, margin: "0 auto" }} className="px-4 py-4">
          {children}
        </div>
      </main>

      {/* SIDEBAR KANAN — wide screens only */}
      {isWide && (
        <aside
          style={{ width: 288 }}
          className="fixed right-0 top-0 h-screen border-l border-border/50 bg-card/50 z-40 p-4 overflow-y-auto"
        >
          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Cari golfer, klub, event..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-secondary border-none outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  navigate(`/play?q=${(e.target as HTMLInputElement).value}`);
                }
              }}
            />
          </div>

          <UpcomingEventsWidget navigate={navigate} />
          <SuggestedClubsWidget navigate={navigate} />
        </aside>
      )}
    </div>
  );
};

const UpcomingEventsWidget = ({ navigate }: { navigate: (path: string) => void }) => {
  const { data: events } = useQuery({
    queryKey: ["desktop-upcoming-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, name, event_date, courses(name)")
        .in("status", ["registration", "draft"])
        .order("event_date")
        .limit(4);
      return data ?? [];
    },
  });

  if (!events?.length) return null;

  return (
    <div className="golf-card p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-foreground">Upcoming Events</p>
        <button onClick={() => navigate("/tour")} className="text-[10px] text-primary hover:underline">
          See all
        </button>
      </div>
      <div className="space-y-2">
        {events.map((e: any) => (
          <button
            key={e.id}
            onClick={() => navigate(`/event/${e.id}`)}
            className="w-full text-left hover:opacity-70 transition-opacity"
          >
            <p className="text-xs font-medium truncate text-foreground">{e.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {e.event_date} · {(e.courses as any)?.name}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

const SuggestedClubsWidget = ({ navigate }: { navigate: (path: string) => void }) => {
  const { data: clubs } = useQuery({
    queryKey: ["desktop-suggested-clubs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clubs")
        .select("id, name, logo_url, members(count)")
        .eq("is_personal", false)
        .order("created_at", { ascending: false })
        .limit(4);
      return data ?? [];
    },
  });

  if (!clubs?.length) return null;

  return (
    <div className="golf-card p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-foreground">Discover Clubs</p>
        <button onClick={() => navigate("/clubs")} className="text-[10px] text-primary hover:underline">
          See all
        </button>
      </div>
      <div className="space-y-2">
        {clubs.map((c: any) => (
          <button
            key={c.id}
            onClick={() => navigate(`/clubs/${c.id}`)}
            className="flex items-center gap-2 w-full text-left hover:opacity-70 transition-opacity"
          >
            <Avatar className="h-7 w-7 rounded-lg">
              <AvatarImage src={c.logo_url ?? ""} />
              <AvatarFallback className="rounded-lg bg-primary/10 text-[10px] font-bold text-primary">
                {c.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate text-foreground">{c.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {(c.members as any)?.[0]?.count ?? 0} members
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DesktopLayout;
