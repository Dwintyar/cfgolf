import DesktopLayout from "@/components/DesktopLayout";
import { Search, Plus, Users, ChevronRight, Shield, Crown, Star } from "lucide-react";
import CreateClubDialog from "@/components/CreateClubDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
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
  memberCount: number;
  initials: string;
};

const facilityLabel: Record<string, string> = {
  golf_club: "Golf Club",
  driving_range: "Driving Range",
  golf_academy: "Academy",
};

const Clubs = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"my" | "community">("my");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showCreateClub, setShowCreateClub] = useState(false);
  const [joiningClubId, setJoiningClubId] = useState<string | null>(null);

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
    if (error) { toast.error("Gagal bergabung"); return; }
    toast.success(`Bergabung ke ${club.name}!`);
    queryClient.invalidateQueries({ queryKey: ["clubs"] });
    queryClient.invalidateQueries({ queryKey: ["my-memberships"] });
  };

  // ── My Club Card (larger, detailed) ──
  const renderMyCard = (club: ClubData, i: number) => {
    const role = myMemberships?.[club.id];
    const isOwner = club.owner_id === currentUserId;
    const isAdmin = role === "admin" || role === "owner";

    return (
      <div
        key={club.id}
        className="group golf-card overflow-hidden cursor-pointer hover:border-primary/40 hover:shadow-md transition-all duration-200 animate-fade-in"
        style={{ animationDelay: `${i * 50}ms` }}
        onClick={() => navigate(isAdmin ? `/admin/club/${club.id}` : `/clubs/${club.id}`)}
      >
        {/* Header band */}
        <div className="h-16 bg-gradient-to-br from-primary/20 to-primary/5 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%, hsl(var(--primary)) 0%, transparent 60%)" }} />
        </div>

        <div className="px-4 pb-4">
          {/* Avatar overlapping header */}
          <div className="flex items-end justify-between -mt-8 mb-3">
            <Avatar className="h-16 w-16 rounded-2xl border-4 border-card shadow-md">
              <AvatarImage src={club.logo_url ?? ""} className="rounded-xl object-cover" />
              <AvatarFallback className="rounded-xl bg-primary/15 text-lg font-bold text-primary">
                {club.initials}
              </AvatarFallback>
            </Avatar>
            {/* Role badge */}
            {isOwner ? (
              <span className="flex items-center gap-1 rounded-full bg-yellow-500/15 px-2.5 py-1 text-[10px] font-bold text-yellow-500 border border-yellow-500/30">
                <Crown className="h-3 w-3" /> Owner
              </span>
            ) : isAdmin ? (
              <span className="flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-1 text-[10px] font-bold text-blue-400 border border-blue-500/30">
                <Shield className="h-3 w-3" /> Admin
              </span>
            ) : (
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-medium text-muted-foreground border border-border">
                Member
              </span>
            )}
          </div>

          <h3 className="font-semibold text-sm leading-tight truncate">{club.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground font-medium">
              {facilityLabel[club.facility_type] ?? club.facility_type}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Users className="h-3 w-3" /> {club.memberCount}
            </span>
          </div>
          {club.description && (
            <p className="mt-1.5 text-[11px] text-muted-foreground line-clamp-2">{club.description}</p>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
            {isAdmin ? (
              <Button size="sm" className="h-7 text-[10px] font-bold px-4 gap-1"
                onClick={e => { e.stopPropagation(); navigate(`/admin/club/${club.id}`); }}>
                Manage
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="h-7 text-[10px] px-4"
                onClick={e => { e.stopPropagation(); navigate(`/clubs/${club.id}`); }}>
                View
              </Button>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>
    );
  };

  // ── Community Club Card (compact grid) ──
  const renderCommunityCard = (club: ClubData, i: number) => (
    <div
      key={club.id}
      className="group golf-card overflow-hidden cursor-pointer hover:border-primary/30 hover:shadow-md transition-all duration-200 animate-fade-in"
      style={{ animationDelay: `${i * 40}ms` }}
      onClick={() => navigate(`/clubs/${club.id}`)}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 rounded-xl border border-border/50 shrink-0">
            <AvatarImage src={club.logo_url ?? ""} className="rounded-xl object-cover" />
            <AvatarFallback className="rounded-xl bg-primary/10 text-sm font-bold text-primary">
              {club.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate leading-tight">{club.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-muted-foreground">
                {facilityLabel[club.facility_type] ?? club.facility_type}
              </span>
              <span className="text-muted-foreground/40 text-[10px]">·</span>
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Users className="h-2.5 w-2.5" /> {club.memberCount}
              </span>
            </div>
          </div>
        </div>

        {club.description && (
          <p className="mt-2 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
            {club.description}
          </p>
        )}

        <Button
          size="sm"
          className="mt-3 w-full h-8 text-xs font-bold uppercase tracking-wide"
          disabled={joiningClubId === club.id}
          onClick={e => handleJoin(club, e)}
        >
          {joiningClubId === club.id ? "Joining…" : "Join"}
        </Button>
      </div>
    </div>
  );

  return (
    <DesktopLayout>
      <div className="bottom-nav-safe">

        {/* Search bar */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-3">
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
        <div className="flex px-4 mb-4 gap-1 rounded-xl overflow-hidden border border-border/50 mx-4">
          {(["my", "community"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                tab === t ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "my" ? `My Clubs${myClubs.length > 0 ? ` (${myClubs.length})` : ""}` : `Community${communityClubs.length > 0 ? ` (${communityClubs.length})` : ""}`}
            </button>
          ))}
        </div>

        {/* My Clubs */}
        {tab === "my" && (
          <div className="px-4">
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {myClubs.map((club, i) => renderMyCard(club, i))}
            </div>
          </div>
        )}

        {/* Community */}
        {tab === "community" && (
          <div className="px-4">
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
      </div>
    </DesktopLayout>
  );
};

export default Clubs;
