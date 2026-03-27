import DesktopLayout from "@/components/DesktopLayout";
import { Search, ArrowLeft, Mic, Plus } from "lucide-react";
import CreateClubDialog from "@/components/CreateClubDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";

type ClubData = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  facility_type: string;
  owner_id: string | null;
  memberCount: number;
  initials: string;
};

const Clubs = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showCreateClub, setShowCreateClub] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const { data: clubs, isLoading } = useQuery({
    queryKey: ["clubs"],
    queryFn: async () => {
      const { data: clubsData, error } = await supabase
        .from("clubs")
        .select("*, members(count)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return clubsData.map((c) => ({
        ...c,
        memberCount: (c.members as any)?.[0]?.count ?? 0,
        initials: c.name
          .split(" ")
          .slice(0, 2)
          .map((w: string) => w[0])
          .join("")
          .toUpperCase(),
      })) as ClubData[];
    },
  });

  const { data: myMemberships } = useQuery({
    queryKey: ["my-memberships", currentUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("club_id, role")
        .eq("user_id", currentUserId!);
      if (error) throw error;
      return Object.fromEntries(data.map((m) => [m.club_id, m.role])) as Record<string, string>;
    },
    enabled: !!currentUserId,
  });

  const { data: myPendingRequests } = useQuery({
    queryKey: ["my-pending-requests", currentUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_invitations")
        .select("club_id")
        .eq("invited_user_id", currentUserId!)
        .eq("invited_by", currentUserId!)
        .eq("status", "pending");
      if (error) throw error;
      return new Set(data.map((r) => r.club_id));
    },
    enabled: !!currentUserId,
  });

  const { data: clubsWithCourses } = useQuery({
    queryKey: ["clubs-with-courses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("club_id")
        .not("club_id", "is", null);
      return new Set((data ?? []).map((c) => c.club_id));
    },
  });

  const applySearch = (list: ClubData[]) =>
    search ? list.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())) : list;

  const isMember = (id: string) => myMemberships ? id in myMemberships : false;

  const myClubs = applySearch(clubs?.filter((c) => isMember(c.id)) ?? []).sort((a, b) => a.name.localeCompare(b.name));
  const communityClubs = applySearch(
    clubs?.filter(
      (c) =>
        !isMember(c.id) &&
        !clubsWithCourses?.has(c.id) &&
        c.facility_type !== "driving_range"
    ) ?? []
  ).sort((a, b) => a.name.localeCompare(b.name));
  const courseClubs = applySearch(
    clubs?.filter((c) => !isMember(c.id) && clubsWithCourses?.has(c.id)) ?? []
  ).sort((a, b) => a.name.localeCompare(b.name));
  const rangeClubs = applySearch(
    clubs?.filter((c) => !isMember(c.id) && c.facility_type === "driving_range") ?? []
  ).sort((a, b) => a.name.localeCompare(b.name));

  const facilityBadgeColors: Record<string, string> = {
    golf_club: "border-primary/30 text-primary",
    driving_range: "border-yellow-500/30 text-yellow-500",
    golf_academy: "border-blue-400/30 text-blue-400",
  };

  const facilityLabels: Record<string, string> = {
    golf_club: "Golf Club",
    driving_range: "Driving Range",
    golf_academy: "Academy",
  };

  const getRoleBadge = (club: ClubData) => {
    if (club.owner_id === currentUserId) {
      return <Badge className="mt-1.5 text-[10px] bg-yellow-500/15 text-yellow-600 border-yellow-500/30">👑 Owner</Badge>;
    }
    const role = myMemberships?.[club.id];
    if (role === "admin") {
      return <Badge className="mt-1.5 text-[10px] bg-blue-500/15 text-blue-500 border-blue-500/30">🛡️ Admin</Badge>;
    }
    return <Badge className="mt-1.5 text-[10px] bg-muted text-muted-foreground border-border">Member</Badge>;
  };

  const renderClubCard = (club: ClubData, index: number, isMyClub: boolean) => {
    const isOwnerOrAdmin = club.owner_id === currentUserId || myMemberships?.[club.id] === "admin";
    const isPending = myPendingRequests?.has(club.id);

    return (
      <div
        key={club.id}
        className="golf-card flex items-center gap-4 p-4 animate-fade-in cursor-pointer"
        style={{ animationDelay: `${index * 60}ms` }}
        onClick={() => navigate(isMyClub && isOwnerOrAdmin ? `/admin/club/${club.id}` : `/clubs/${club.id}`)}
      >
        <Avatar className="h-20 w-20 rounded-xl border-2 border-primary/20">
          <AvatarImage src={club.logo_url ?? ""} className="rounded-xl object-cover" />
          <AvatarFallback className="rounded-xl bg-primary/10 text-lg font-bold text-primary">
            {club.initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold truncate">{club.name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className={`text-[9px] ${facilityBadgeColors[club.facility_type] ?? ""}`}>
              {facilityLabels[club.facility_type] ?? club.facility_type}
            </Badge>
            <span className="text-[10px] text-muted-foreground">{club.memberCount} members</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
            {club.description || "Golf Club"}
          </p>

          {isMyClub ? (
            <div className="flex items-center gap-2">
              {getRoleBadge(club)}
              {isOwnerOrAdmin ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1.5 h-7 rounded-lg px-4 text-[10px] font-semibold"
                  onClick={(e) => { e.stopPropagation(); navigate(`/admin/club/${club.id}`); }}
                >
                  Manage
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-1.5 h-7 rounded-lg px-4 text-[10px] font-semibold"
                  onClick={(e) => { e.stopPropagation(); navigate(`/clubs/${club.id}`); }}
                >
                  View
                </Button>
              )}
            </div>
          ) : isPending ? (
            <Badge variant="secondary" className="mt-2 text-xs">⏳ Requested</Badge>
          ) : (
            <Button
              size="sm"
              className="mt-2 h-8 rounded-lg px-6 text-xs font-bold uppercase tracking-wider"
              onClick={(e) => { e.stopPropagation(); navigate(`/clubs/${club.id}`); }}
            >
              Join
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderEmpty = (msg: string) => (
    <p className="text-center text-sm text-muted-foreground py-8">{msg}</p>
  );

  const renderSkeleton = () =>
    Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="golf-card flex items-center gap-4 p-4">
        <Skeleton className="h-20 w-20 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    ));

  const renderList = (list: ClubData[], isMyClub: boolean, emptyMsg: string) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {isLoading && renderSkeleton()}
      {!isLoading && list.length === 0 && <div className="col-span-full">{renderEmpty(emptyMsg)}</div>}
      {list.map((club, i) => renderClubCard(club, i, isMyClub))}
    </div>
  );

  return (
    <DesktopLayout>
    <div className="bottom-nav-safe">
      <div className="flex items-center gap-2 p-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clubs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 rounded-xl border-border/50 bg-card/80 pl-10 pr-10"
          />
          <Mic className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        <button
          onClick={() => setShowCreateClub(true)}
          className="rounded-full p-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <Tabs defaultValue="my-clubs" className="px-4">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="my-clubs" className="text-xs">My Clubs</TabsTrigger>
          <TabsTrigger value="community" className="text-xs">Community</TabsTrigger>
        </TabsList>

        <TabsContent value="my-clubs">
          {renderList(myClubs, true, "Kamu belum bergabung ke club manapun.")}
        </TabsContent>
        <TabsContent value="community">
          {renderList(communityClubs, false, "Tidak ada community club tersedia.")}
        </TabsContent>
      </Tabs>

      <CreateClubDialog
        open={showCreateClub}
        onOpenChange={setShowCreateClub}
        onCreated={() => {
          setShowCreateClub(false);
          window.location.reload();
        }}
      />
    </div>
    </DesktopLayout>
  );
};

export default Clubs;
