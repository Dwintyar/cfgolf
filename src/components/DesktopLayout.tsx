import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useContext } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatNotifContext } from "@/App";
import { Badge } from "@/components/ui/badge";
import {
  Newspaper, Users, Trophy, MapPin,
  Bell, MessageCircle, Settings,
  Building2, Search, Flag, ShieldCheck
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

const ActiveGolfersWidget = ({ navigate }: { navigate: (path: string) => void }) => {
  const { data: golfers } = useQuery({
    queryKey: ["desktop-active-golfers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, handicap")
        .not("full_name", "is", null)
        .order("updated_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  if (!golfers?.length) return null;

  return (
    <div className="golf-card p-3 mt-3">
      <p className="text-xs font-semibold mb-2 text-foreground">Golfers</p>
      <div className="space-y-2">
        {golfers.map((g: any) => (
          <button
            key={g.id}
            onClick={() => navigate(`/profile/${g.id}`)}
            className="flex items-center gap-2 w-full text-left hover:opacity-70 transition-opacity"
          >
            <div className="relative">
              <Avatar className="h-8 w-8">
                <AvatarImage src={g.avatar_url ?? ""} />
                <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                  {(g.full_name ?? "?").charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate text-foreground">{g.full_name}</p>
              <p className="text-[10px] text-muted-foreground">HCP {g.handicap ?? "N/A"}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const DesktopLayout = ({ children, sidebarRightHidden = false }: { children: React.ReactNode; sidebarRightHidden?: boolean }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useContext(ChatNotifContext);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const width = useWindowWidth();
  const isDesktop = width >= 1024;
  const isWide = width >= 1280;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email ?? null);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUserId(session?.user?.id ?? null);
        setUserEmail(session?.user?.email ?? null);
      }
    );

    return () => subscription.unsubscribe();
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
    staleTime: 1000 * 60 * 5,
  });

  const isAdmin = userEmail === "dwintyar@gmail.com";

  const { data: pendingCount } = useQuery({
    queryKey: ["sidebar-pending-approvals-count"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pending_approvals")
        .select("id")
        .eq("status", "pending");
      return data?.length ?? 0;
    },
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  const navItems = [
    { path: "/news", label: "Feeds", icon: Newspaper },
    { path: "/chat", label: "Messages", icon: MessageCircle },
    { path: "/clubs", label: "Clubs", icon: Building2 },
    { path: "/tour", label: "Play", icon: Flag },
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
      {/* TOP NAVBAR */}
      <header className="fixed top-0 left-0 right-0 h-14 z-50 border-b border-border/50 bg-card/95 backdrop-blur-lg flex items-center justify-between px-4 gap-4">
        {/* Kiri: Logo */}
        <div className="flex items-center gap-2 w-56 shrink-0">
          <img src={logo} alt="GolfBuana" className="h-8 w-8 rounded-lg object-contain" />
          <span className="font-display text-lg font-bold text-foreground">GolfBuana</span>
        </div>

        {/* Tengah: Search bar */}
        <div className="flex-1 max-w-xs">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Cari golfer, klub, event..."
              className="w-full pl-9 pr-4 py-1.5 text-sm rounded-full bg-secondary border-none outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  navigate(`/play?q=${(e.target as HTMLInputElement).value}`);
                }
              }}
            />
          </div>
        </div>

        {/* Kanan: Actions */}
        <div className="flex items-center gap-1 w-56 justify-end">
          <button onClick={() => navigate("/notifications")} className="relative p-2 rounded-full hover:bg-secondary transition-colors">
            <Bell className="h-5 w-5 text-foreground" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
          </button>
          <button onClick={() => navigate("/chat")} className="relative p-2 rounded-full hover:bg-secondary transition-colors">
            <MessageCircle className="h-5 w-5 text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <button onClick={() => navigate("/profile")} className="p-2 rounded-full hover:bg-secondary transition-colors">
            <Avatar className="h-8 w-8 border-2 border-primary/20">
              <AvatarImage src={profile?.avatar_url ?? ""} />
              <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                {getInitials(profile?.full_name ?? null)}
              </AvatarFallback>
            </Avatar>
          </button>
          <button onClick={() => navigate("/settings")} className="p-2 rounded-full hover:bg-secondary transition-colors">
            <Settings className="h-5 w-5 text-foreground" />
          </button>
        </div>
      </header>

      {/* SIDEBAR KIRI */}
      <aside
        style={{ width: 256 }}
        className="fixed left-0 top-14 h-[calc(100vh-3.5rem)] border-r border-border/50 bg-card z-40 p-4 flex flex-col overflow-y-auto"
      >
        {/* Profile Card */}
        <div
          className="flex items-center gap-3 px-2 py-3 mb-2 rounded-xl hover:bg-secondary cursor-pointer transition-colors"
          onClick={() => navigate("/profile")}
        >
          <Avatar className="h-10 w-10 border-2 border-primary/20">
            <AvatarImage src={profile?.avatar_url ?? ""} />
            <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
              {getInitials(profile?.full_name ?? null)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate text-foreground">
              {profile?.full_name ?? "Golfer"}
            </p>
            <p className="text-xs text-muted-foreground">
              HCP {profile?.handicap ?? "N/A"}
            </p>
          </div>
        </div>
        <div className="border-t border-border/30 mb-2" />

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

          {/* Admin Approvals */}
          {isAdmin && (
            <>
              <div className="border-t border-border/30 my-2" />
              <button
                onClick={() => navigate("/admin/approvals")}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                  location.pathname === "/admin/approvals"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <ShieldCheck className="h-[18px] w-[18px] shrink-0" />
                Approvals
                {(pendingCount ?? 0) > 0 && (
                  <Badge variant="destructive" className="ml-auto text-[10px] px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center">
                    {pendingCount}
                  </Badge>
                )}
              </button>
            </>
          )}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main
        style={{
          marginLeft: "256px",
          marginRight: (isWide && !sidebarRightHidden) ? "260px" : "0px",
          width: `calc(100% - 256px - ${(isWide && !sidebarRightHidden) ? "260px" : "0px"})`,
          minHeight: "100vh",
        }}
        className="pt-14"
      >
        <div className="w-full px-6 py-4">
          {children}
        </div>
      </main>

      {/* SIDEBAR KANAN — wide screens only */}
      {isWide && !sidebarRightHidden && (
        <aside
          style={{ width: 260 }}
          className="fixed right-0 top-14 h-[calc(100vh-3.5rem)] border-l border-border/50 bg-card/50 z-40 p-4 overflow-y-auto"
        >
          <UpcomingEventsWidget navigate={navigate} />
          <SuggestedClubsWidget navigate={navigate} />
          <ActiveGolfersWidget navigate={navigate} />
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
