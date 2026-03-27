import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useContext, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatNotifContext } from "@/App";
import { Badge } from "@/components/ui/badge";
import {
  Newspaper, Users, Trophy, MapPin,
  Bell, MessageCircle, Settings,
  Building2, Search, Flag, ShieldCheck,
  ChevronDown, LogOut, TrendingUp, User
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<{ golfers: any[], clubs: any[], events: any[] }>({ golfers: [], clubs: [], events: [] });
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

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

  // Close search on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) { setSearchResults({ golfers: [], clubs: [], events: [] }); setSearchOpen(false); return; }
    setSearching(true);
    setSearchOpen(true);
    const [{ data: golfers }, { data: clubs }, { data: events }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, avatar_url, handicap").ilike("full_name", `%${q}%`).limit(4),
      supabase.from("clubs").select("id, name, facility_type, logo_url").ilike("name", `%${q}%`).limit(4),
      supabase.from("events").select("id, name, event_date, tours(name)").ilike("name", `%${q}%`).limit(4),
    ]);
    setSearchResults({ golfers: golfers ?? [], clubs: clubs ?? [], events: events ?? [] });
    setSearching(false);
  };

  const hasResults = searchResults.golfers.length > 0 || searchResults.clubs.length > 0 || searchResults.events.length > 0;

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
      <header className="fixed top-0 left-0 right-0 h-14 z-50 border-b border-border/50 bg-card/95 backdrop-blur-lg flex items-center px-4 gap-3">

        {/* ── KIRI: Logo ── */}
        <button
          onClick={() => navigate("/news")}
          className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity"
        >
          <img src={logo} alt="GolfBuana" className="h-8 w-8 rounded-lg object-contain" />
          <span className="font-display text-base font-bold text-foreground hidden xl:block">GolfBuana</span>
        </button>

        {/* ── TENGAH: Nav items + Search ── */}
        <div className="flex-1 flex items-center justify-center gap-1">
          {/* Nav tabs */}
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = location.pathname.startsWith(path);
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`relative flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl text-xs font-medium transition-colors ${ 
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="leading-none">{label}</span>
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}

          {/* Divider */}
          <div className="w-px h-6 bg-border/50 mx-2" />

          {/* Search bar */}
          <div className="relative w-48 xl:w-64" ref={searchRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={searchQuery}
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-full bg-secondary border-none outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => { if (searchQuery.length >= 2) setSearchOpen(true); }}
            />
            {/* Search dropdown */}
            {searchOpen && searchQuery.length >= 2 && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">
                {searching && (
                  <div className="p-3 text-xs text-muted-foreground text-center">Searching...</div>
                )}
                {!searching && !hasResults && (
                  <div className="p-3 text-xs text-muted-foreground text-center">Tidak ada hasil untuk "{searchQuery}"</div>
                )}
                {!searching && searchResults.golfers.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-secondary/50">Golfer</div>
                    {searchResults.golfers.map((p: any) => (
                      <button key={p.id} onClick={() => { navigate(`/profile/${p.id}`); setSearchOpen(false); setSearchQuery(""); }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary/50 text-left transition-colors">
                        <Avatar className="h-7 w-7 border border-border shrink-0">
                          <AvatarImage src={p.avatar_url ?? ""} />
                          <AvatarFallback className="text-[10px]">{p.full_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm flex-1 truncate">{p.full_name}</span>
                        {p.handicap != null && <span className="text-[10px] text-muted-foreground">HCP {p.handicap}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {!searching && searchResults.clubs.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-secondary/50">Klub</div>
                    {searchResults.clubs.map((c: any) => (
                      <button key={c.id} onClick={() => { navigate(`/clubs/${c.id}`); setSearchOpen(false); setSearchQuery(""); }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary/50 text-left transition-colors">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                          {c.name?.charAt(0)}
                        </div>
                        <span className="text-sm flex-1 truncate">{c.name}</span>
                        <span className="text-[10px] text-muted-foreground">{c.facility_type}</span>
                      </button>
                    ))}
                  </div>
                )}
                {!searching && searchResults.events.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-secondary/50">Event</div>
                    {searchResults.events.map((e: any) => (
                      <button key={e.id} onClick={() => { navigate(`/event/${e.id}`); setSearchOpen(false); setSearchQuery(""); }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary/50 text-left transition-colors">
                        <div className="h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 text-xs">🏆</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{e.name}</p>
                          <p className="text-[10px] text-muted-foreground">{(e.tours as any)?.name} · {e.event_date}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── KANAN: Quick actions + Avatar dropdown ── */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Notifications */}
          <button
            onClick={() => navigate("/notifications")}
            className="relative p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <Bell className="h-5 w-5 text-foreground" />
            {(pendingCount ?? 0) > 0 && isAdmin && (
              <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                {(pendingCount ?? 0) > 9 ? "9+" : pendingCount}
              </span>
            )}
          </button>

          {/* Messages */}
          <button
            onClick={() => navigate("/chat")}
            className="relative p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <MessageCircle className="h-5 w-5 text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Avatar dropdown */}
          <div className="relative" ref={searchRef}>
            <button
              onClick={() => setSearchOpen(v => !v)}
              className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full hover:bg-secondary transition-colors ml-1"
            >
              <Avatar className="h-8 w-8 border-2 border-primary/20">
                <AvatarImage src={profile?.avatar_url ?? ""} />
                <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                  {getInitials(profile?.full_name ?? null)}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            {/* Dropdown menu */}
            {searchOpen && !searchQuery && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden py-1">
                {/* User info */}
                <div className="px-4 py-3 border-b border-border/50">
                  <p className="text-sm font-semibold truncate">{profile?.full_name ?? "Golfer"}</p>
                  <p className="text-xs text-muted-foreground">HCP {profile?.handicap ?? "N/A"}</p>
                </div>
                {/* Menu items */}
                <button onClick={() => { navigate("/profile"); setSearchOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary transition-colors text-left">
                  <User className="h-4 w-4 text-muted-foreground" /> My Profile
                </button>
                <button onClick={() => { navigate("/settings"); setSearchOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary transition-colors text-left">
                  <Settings className="h-4 w-4 text-muted-foreground" /> Settings
                </button>
                {isAdmin && (
                  <>
                    <div className="border-t border-border/50 my-1" />
                    <button onClick={() => { navigate("/admin/approvals"); setSearchOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary transition-colors text-left">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                      Approvals
                      {(pendingCount ?? 0) > 0 && (
                        <Badge variant="destructive" className="ml-auto text-[10px] px-1.5 py-0 h-5">
                          {pendingCount}
                        </Badge>
                      )}
                    </button>
                    <button onClick={() => { navigate("/admin"); setSearchOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary transition-colors text-left">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" /> Admin Dashboard
                    </button>
                  </>
                )}
                <div className="border-t border-border/50 my-1" />
                <button
                  onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary transition-colors text-left text-destructive"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* SIDEBAR KIRI — Profile & personal stats */}
      <aside
        style={{ width: 256 }}
        className="fixed left-0 top-14 h-[calc(100vh-3.5rem)] border-r border-border/50 bg-card z-40 p-4 flex flex-col overflow-y-auto gap-3"
      >
        {/* Profile card */}
        <div
          className="golf-card p-4 cursor-pointer hover:border-primary/30 transition-colors"
          onClick={() => navigate("/profile")}
        >
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarImage src={profile?.avatar_url ?? ""} />
              <AvatarFallback className="bg-primary/10 text-base font-bold text-primary">
                {getInitials(profile?.full_name ?? null)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate text-foreground">
                {profile?.full_name ?? "Golfer"}
              </p>
              <p className="text-xs text-muted-foreground">View profile →</p>
            </div>
          </div>
          {/* HCP badge */}
          <div className="flex items-center justify-between bg-primary/10 rounded-lg px-3 py-2">
            <span className="text-xs text-muted-foreground font-medium">Handicap Index</span>
            <span className="text-lg font-extrabold text-primary tabular-nums">
              {profile?.handicap ?? "N/A"}
            </span>
          </div>
        </div>

        {/* Quick links */}
        <div className="golf-card p-3 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">Quick Links</p>
          {[
            { path: "/profile", label: "My Profile", icon: User },
            { path: "/clubs", label: "My Clubs", icon: Building2 },
            { path: "/tour", label: "Tournaments", icon: Trophy },
            { path: "/venue", label: "Book Tee Time", icon: MapPin },
          ].map(({ path, label, icon: Icon }) => {
            const active = location.pathname.startsWith(path);
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm transition-colors text-left ${
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            );
          })}
        </div>

        {/* Admin section */}
        {isAdmin && (
          <div className="golf-card p-3 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">Admin</p>
            <button
              onClick={() => navigate("/admin/approvals")}
              className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm transition-colors text-left ${
                location.pathname === "/admin/approvals"
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Approvals
              {(pendingCount ?? 0) > 0 && (
                <Badge variant="destructive" className="ml-auto text-[10px] px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center">
                  {pendingCount}
                </Badge>
              )}
            </button>
            <button
              onClick={() => navigate("/admin")}
              className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-left"
            >
              <TrendingUp className="h-4 w-4 shrink-0" /> Dashboard
            </button>
          </div>
        )}
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
