import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useContext, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatNotifContext } from "@/App";
import { Badge } from "@/components/ui/badge";
import {
  Home, Newspaper, Users, Trophy, MapPin,
  Bell, MessageSquare, Settings,
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

const VenuesWidget = ({ navigate }: { navigate: (path: string) => void }) => {
  const { data: venues } = useQuery({
    queryKey: ["desktop-venues"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, name, location, image_url")
        .not("name", "is", null)
        .order("name")
        .limit(4);
      return data ?? [];
    },
  });

  if (!venues?.length) return null;

  return (
    <div className="golf-card p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-foreground">Courses</p>
        <button onClick={() => navigate("/venue")} className="text-[10px] text-primary hover:underline">
          See all
        </button>
      </div>
      <div className="space-y-2">
        {venues.map((v: any) => (
          <button
            key={v.id}
            onClick={() => navigate(`/venue`)}
            className="flex items-center gap-2 w-full text-left hover:opacity-70 transition-opacity"
          >
            <div className="h-9 w-9 rounded-lg overflow-hidden bg-secondary shrink-0">
              {v.image_url
                ? <img src={v.image_url} alt={v.name} className="h-full w-full object-cover" />
                : <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                    {v.name?.charAt(0)}
                  </div>
              }
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate text-foreground">{v.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{v.location}</p>
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

  // HCP trend — last 8 events
  const { data: hcpHistory } = useQuery({
    queryKey: ["sidebar-hcp-trend", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("handicap_history")
        .select("new_hcp, old_hcp, created_at, events(name)")
        .eq("player_id", userId!)
        .order("created_at", { ascending: false })
        .limit(8);
      return (data ?? []).reverse();
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  // Live / upcoming tournament
  const { data: liveEvent } = useQuery({
    queryKey: ["sidebar-live-event"],
    queryFn: async () => {
      // Try ongoing first
      const { data: ongoing } = await supabase
        .from("events")
        .select("id, name, event_date, status, courses(name), tours(name)")
        .eq("status", "ongoing")
        .order("event_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (ongoing) return { ...ongoing, isLive: true };
      // Fallback: next upcoming
      const { data: upcoming } = await supabase
        .from("events")
        .select("id, name, event_date, status, courses(name), tours(name)")
        .eq("status", "ready")
        .order("event_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      return upcoming ? { ...upcoming, isLive: false } : null;
    },
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
    { path: "/lounge", label: "Lounge", icon: Home },
    { path: "/clubs", label: "Clubs", icon: Trophy },
    { path: "/rounds", label: "Rounds", icon: Flag },
    { path: "/profile", label: "Profile", icon: User },
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

        {/* ── KIRI: Logo + Search (seperti Facebook) ── */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate("/news")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img src={logo} alt="GolfBuana" className="h-9 w-9 object-contain" />
          </button>

          {/* Search bar di samping logo */}
          <div className="relative" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={searchQuery}
                placeholder="Search GolfBuana..."
                className="w-44 xl:w-56 pl-8 pr-3 py-1.5 text-sm rounded-full bg-secondary border-none outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => { if (searchQuery.length >= 2) setSearchOpen(true); }}
              />
            </div>
            {/* Search dropdown */}
            {searchOpen && searchQuery.length >= 2 && (
              <div className="absolute top-full mt-2 left-0 w-72 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">
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

        <div className="flex-1" />

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
            <MessageSquare className="h-5 w-5 text-foreground" />
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

      {/* SIDEBAR KIRI — WA-style icon-only nav */}
      <aside
        style={{ width: 64 }}
        className="fixed left-0 top-14 h-[calc(100vh-3.5rem)] border-r border-border/50 bg-card z-40 flex flex-col items-center py-3 gap-1"
      >
        {/* Nav icons */}
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = location.pathname.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              title={label}
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-colors ${
                active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[9px] mt-0.5 font-semibold">{label}</span>
            </button>
          );
        })}
        {/* Avatar at bottom */}
        <div className="mt-auto">
          <button
            onClick={() => navigate("/profile")}
            title="Profile"
            className="flex items-center justify-center w-12 h-12 rounded-xl hover:bg-secondary transition-colors"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url ?? ""} />
              <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                {getInitials(profile?.full_name ?? null)}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT — full width minus icon nav */}
      <main
        style={{
          marginLeft: "64px",
          width: "calc(100% - 64px)",
          minHeight: "100vh",
        }}
        className="pt-14"
      >
        <div className="w-full">
          {children}
        </div>
      </main>


    </div>
  );
};

const LiveTournamentWidget = ({
  navigate,
  liveEvent,
}: {
  navigate: (path: string) => void;
  liveEvent: any;
}) => {
  if (!liveEvent) return null;

  return (
    <div className="golf-card p-3 mb-3 border-primary/30">
      <div className="flex items-center gap-2 mb-2">
        {liveEvent.isLive ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/30">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
            LIVE NOW
          </span>
        ) : (
          <span className="text-[10px] font-bold text-primary/70 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
            UPCOMING
          </span>
        )}
        <span className="text-[10px] text-muted-foreground truncate">
          {(liveEvent.tours as any)?.name}
        </span>
      </div>

      <p className="text-sm font-bold text-foreground truncate mb-0.5">{liveEvent.name}</p>
      <p className="text-xs text-muted-foreground mb-3">
        {(liveEvent.courses as any)?.name} · {liveEvent.event_date}
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => navigate(`/event/${liveEvent.id}`)}
          className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-foreground"
        >
          Details
        </button>
        {liveEvent.isLive && (
          <button
            onClick={() => window.open(`/live/${liveEvent.id}`, "_blank")}
            className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            🖥️ Live Display
          </button>
        )}
      </div>
    </div>
  );
};

const UpcomingEventsWidget = ({ navigate, userId }: { navigate: (path: string) => void; userId: string | null }) => {
  const { data: events } = useQuery({
    queryKey: ["desktop-upcoming-events", userId],
    queryFn: async () => {
      if (!userId) return [];

      // Events where user is contestant
      const { data: myContestant } = await supabase
        .from("contestants")
        .select("event_id")
        .eq("player_id", userId);
      const contestantEventIds = (myContestant ?? []).map((c: any) => c.event_id);

      // Club IDs — member of or owner of (includes personal club)
      const { data: myMemberships } = await supabase
        .from("members").select("club_id").eq("user_id", userId);
      const memberClubIds = (myMemberships ?? []).map((m: any) => m.club_id);
      const { data: myOwnedClubs } = await supabase
        .from("clubs").select("id").eq("owner_id", userId);
      const ownedClubIds = (myOwnedClubs ?? []).map((c: any) => c.id);
      const allClubIds = [...new Set([...memberClubIds, ...ownedClubIds])];

      // Events from tours organized by those clubs
      let clubEventIds: string[] = [];
      if (allClubIds.length > 0) {
        const { data: myTours } = await supabase
          .from("tours").select("id").in("organizer_club_id", allClubIds);
        const tourIds = (myTours ?? []).map((t: any) => t.id);
        if (tourIds.length > 0) {
          const { data: te } = await supabase
            .from("events").select("id")
            .in("tour_id", tourIds)
            .in("status", ["scheduled", "ready", "playing"]);
          clubEventIds = (te ?? []).map((e: any) => e.id);
        }
      }

      const allIds = [...new Set([...contestantEventIds, ...clubEventIds])];
      if (!allIds.length) return [];

      const { data } = await supabase
        .from("events")
        .select("id, name, event_date, status, courses(name), tours(organizer_club_id, clubs!tours_organizer_club_id_fkey(is_personal))")
        .in("id", allIds)
        .in("status", ["scheduled", "ready", "playing"])
        .order("event_date")
        .limit(5);
      return data ?? [];
    },
    enabled: !!userId,
  });

  if (!events?.length) return null;

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  return (
    <div className="golf-card p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-foreground">Upcoming Events</p>
        <button onClick={() => navigate("/tour")} className="text-[10px] text-primary hover:underline">
          See all
        </button>
      </div>
      <div className="space-y-2">
        {events.map((e: any) => {
          const isToday = e.event_date === today;
          const isTomorrow = e.event_date === tomorrow;
          const isPlaying = (e as any).status === "playing";
          const showPlay = isToday || isPlaying || (isToday && (e as any).status === 'ready');
          return (
            <div key={e.id} className={`rounded-xl p-2 transition-colors ${showPlay ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"}`}>
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => navigate(`/event/${e.id}`)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="flex items-center gap-1.5">
                    {isPlaying && <span className="text-[9px] font-bold text-green-400 uppercase bg-green-400/20 px-1.5 py-0.5 rounded-full">🟢 Live</span>}
                    {isToday && !isPlaying && <span className="text-[9px] font-bold text-primary uppercase bg-primary/20 px-1.5 py-0.5 rounded-full">Today</span>}
                    {isTomorrow && !showPlay && <span className="text-[9px] font-bold text-amber-400 uppercase bg-amber-400/20 px-1.5 py-0.5 rounded-full">Besok</span>}
                  </div>
                  <p className="text-xs font-medium truncate text-foreground mt-0.5">{e.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {e.event_date} · {(e.courses as any)?.name}
                  </p>
                </button>
                {showPlay && (
                  <button
                    onClick={() => {
                      const isPersonal = (e as any)?.tours?.clubs?.is_personal;
                      if (isPersonal) {
                        navigate(`/event/${e.id}/scorecard`);
                      } else {
                        navigate(`/event/${e.id}`);
                      }
                    }}
                    className="shrink-0 flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    ▶ Play
                  </button>
                )}
              </div>
            </div>
          );
        })}
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
