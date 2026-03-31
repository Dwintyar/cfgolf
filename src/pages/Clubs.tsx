import { Search, Plus, Users, ChevronRight, Shield, Crown, Star } from "lucide-react";
import CreateClubDialog from "@/components/CreateClubDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate, useSearchParams } from "react-router-dom";
import GBLogo from "@/assets/logo-gb.svg";
import GBLogoDark from "@/assets/logo-gb-dark.svg";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { toast } from "sonner";

type ClubData = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  facility_type: string;
  owner_id: string | null;
  is_personal: boolean;
  club_type: string;
  memberCount: number;
  initials: string;
};

const facilityLabel: Record<string, string> = {
  golf_club: "Golf Club",
  driving_range: "Driving Range",
  golf_academy: "Academy",
  "Golf Course": "Golf Course",
};

const getClubLabel = (club: ClubData) => {
  if (club.club_type === "venue") return "⛳ Golf Venue";
  return facilityLabel[club.facility_type] ?? "Golf Club";
};

const Clubs = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"my" | "community">(
    (searchParams.get("tab") as "my" | "community") ?? "my"
  );
  const [selectedClubId, setSelectedClubId] = useState<string | null>(
    searchParams.get("clubId") ?? null
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showCreateClub, setShowCreateClub] = useState(false);
  const [joiningClubId, setJoiningClubId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [isDesktop, setIsDesktop] = useState(typeof window !== "undefined" ? window.innerWidth >= 1024 : false);

  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const { data: clubs, isLoading } = useQuery({
    queryKey: ["clubs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("*, members(count)")
        .order("name");
      if (error) throw error;
      return data.map((c) => ({
        ...c,
        memberCount: (c.members as any)?.[0]?.count ?? 0,
        initials: c.name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase(),
      })) as ClubData[];
    },
  });

  const { data: myMemberships } = useQuery({
    queryKey: ["my-memberships", currentUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from("members").select("club_id, role").eq("user_id", currentUserId!);
      return Object.fromEntries((data ?? []).map((m) => [m.club_id, m.role])) as Record<string, string>;
    },
    enabled: !!currentUserId,
  });

  const isMember = (id: string) => myMemberships ? id in myMemberships : false;

  const filtered = (list: ClubData[]) =>
    search ? list.filter(c => c.name.toLowerCase().includes(search.toLowerCase())) : list;

  // My Clubs — member of (excluding personal)
  const myClubs = filtered(
    (clubs ?? []).filter(c => isMember(c.id) && !c.is_personal)
  );

  // Community — not a member, not personal, not driving range
  const communityClubs = filtered(
    (clubs ?? []).filter(c => !isMember(c.id) && !c.is_personal && c.facility_type !== "driving_range")
  );
  const venueClubs = filtered(
    (clubs ?? []).filter(c => c.club_type === "venue")
  );

  const handleJoin = async (club: ClubData, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) { navigate("/login"); return; }
    setJoiningClubId(club.id);
    const { error } = await supabase.from("members").insert({
      club_id: club.id,
      user_id: currentUserId,
      role: "member",
    });
    setJoiningClubId(null);
    if (error) { toast.error("Failed to join"); return; }
    toast.success(`Joined ${club.name}!`);
    queryClient.invalidateQueries({ queryKey: ["clubs"] });
    queryClient.invalidateQueries({ queryKey: ["my-memberships"] });
  };

  // ── My Club Card (larger, detailed) ──
  const renderMyCard = (club: ClubData, i: number) => {
    const role = myMemberships?.[club.id];
    const isOwner = club.owner_id === currentUserId;
    const isAdmin = role === "admin" || role === "owner";

    const isSelected = selectedClubId === club.id;
    return (
      <button
        key={club.id}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border/30 last:border-0 ${isSelected ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-secondary/50"}`}
        onClick={() => { if (isDesktop) { setSelectedClubId(club.id); } else { navigate(`/clubs/${club.id}`); } }}
      >
        <Avatar className="h-12 w-12 rounded-2xl shrink-0">
          <AvatarImage src={club.logo_url ?? ""} className="rounded-2xl object-cover" />
          <AvatarFallback className="rounded-2xl bg-primary/10 text-sm font-bold text-primary">{club.initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className={`text-base font-semibold truncate ${isSelected ? "text-primary" : ""}`}>{club.name}</p>
          <p className="text-[13px] text-muted-foreground truncate mt-0.5">
            {getClubLabel(club)} · {club.memberCount} {club.club_type === "venue" ? "staff" : "members"}
            {isOwner ? " · Owner" : isAdmin ? " · Admin" : " · Member"}
          </p>
          {club.description && <p className="text-[13px] text-muted-foreground truncate mt-0.5">{club.description}</p>}
        </div>
        <ChevronRight className={`h-4 w-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
      </button>
    );
  };

  // ── Community Club Row (WA-style) ──
  const renderCommunityCard = (club: ClubData, i: number) => {
    const isSelected = selectedClubId === club.id;
    return (
    <button
      key={club.id}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border/30 last:border-0 ${isSelected ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-secondary/50"}`}
      onClick={() => navigate(`/clubs/${club.id}`)}
    >
      <Avatar className="h-12 w-12 rounded-2xl shrink-0">
        <AvatarImage src={club.logo_url ?? ""} className="rounded-2xl object-cover" />
        <AvatarFallback className="rounded-2xl bg-primary/10 text-sm font-bold text-primary">{club.initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className={`text-base font-semibold truncate ${isSelected ? "text-primary" : ""}`}>{club.name}</p>
        <p className="text-[13px] text-muted-foreground truncate mt-0.5">
          {getClubLabel(club)} · {club.memberCount} {club.club_type === "venue" ? "staff" : "members"}
        </p>
        {club.description && <p className="text-[13px] text-muted-foreground truncate mt-0.5">{club.description}</p>}
      </div>
      <ChevronRight className={`h-4 w-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
    </button>
    );
  };

  return (
      <div className="flex" style={{height: "calc(100vh - 56px)"}}>
        {/* LEFT PANEL — club list (mobile: full, desktop: fixed width) */}
        <div className={`${mobileShowDetail ? "hidden lg:flex lg:w-[320px]" : "flex lg:w-[320px]"} flex-col shrink-0 border-r border-border/50 h-full overflow-hidden`}>
        <div className="flex-1 overflow-y-auto">
        {/* Header with logo */}
        <div className="flex items-center gap-2 px-4 pt-2 pb-1">
          <img src={document.documentElement.classList.contains("light") ? GBLogo : GBLogoDark} alt="GB" className="h-8 w-8 object-contain shrink-0" />
          <h1 className="text-xl font-bold">Clubs</h1>
        </div>
        <div className="flex items-center gap-2 px-4 pt-1 pb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search clubs…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-10 rounded-xl bg-secondary border-none pl-10 text-sm"
            />
          </div>
          <button
            onClick={() => setShowCreateClub(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 mb-0 border-b border-border/50">
          {([
            { id: "my", label: `My Clubs${myClubs.length > 0 ? ` (${myClubs.length})` : ""}` },
            { id: "community", label: "Discover" },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
                tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>



        {/* My Clubs */}
        {tab === "my" && (
          <div>
            {isLoading && (
              <div className="flex flex-col gap-2 px-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="golf-card overflow-hidden">
                    <Skeleton className="h-16 w-full" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-16 w-16 rounded-2xl -mt-8" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!isLoading && myClubs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="text-base font-semibold">Belum bergabung ke club</p>
                <p className="text-sm text-muted-foreground mt-1">Temukan dan bergabung ke golf club komunitas</p>
                <Button size="sm" className="mt-4" onClick={() => setTab("community")}>
                  Browse Community
                </Button>
              </div>
            )}
            <div className="flex flex-col">
              {myClubs.map((club, i) => renderMyCard(club, i))}
            </div>
          </div>
        )}

        {/* Community */}
        {tab === "community" && (
          <div>
            {isLoading && (
              <div className="flex flex-col gap-2 px-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="golf-card p-4 space-y-3">
                    <div className="flex gap-3">
                      <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            )}
            {!isLoading && communityClubs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-sm text-muted-foreground">
                  {search ? "Tidak ada club yang cocok" : "Tidak ada club komunitas tersedia"}
                </p>
              </div>
            )}
            <div className="flex flex-col">
              {communityClubs.map((club, i) => renderCommunityCard(club, i))}
            </div>
          </div>
        )}

        <div className="h-8" />

        <CreateClubDialog
          open={showCreateClub}
          onOpenChange={setShowCreateClub}
          onCreated={() => {
            setShowCreateClub(false);
            queryClient.invalidateQueries({ queryKey: ["clubs"] });
          }}
        />
        </div>{/* end left panel scroll */}
        </div>{/* end left panel */}

        {/* RIGHT PANEL — club detail (hidden when courses tab active) */}
        <div className={`${mobileShowDetail ? "flex" : "hidden lg:flex"} flex-1 flex-col overflow-hidden`}>
          {!selectedClubId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Users className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <p className="text-base font-semibold text-muted-foreground">Select a club</p>
              <p className="text-sm text-muted-foreground mt-1">Choose a club from the left to see details</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <ClubProfilePanel
                key={selectedClubId}
                embedded
                clubId={selectedClubId!}
                onBack={() => setSelectedClubId(null)}
              />
            </div>
          )}
        </div>

      </div>
  );
};

export default Clubs;
