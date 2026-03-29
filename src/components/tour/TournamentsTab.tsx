import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trophy } from "lucide-react";
import CreateTourDialog from "./CreateTourDialog";

const TournamentsTab = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tourTab, setTourTab] = useState<"mine" | "invited" | "all">("mine");
  const [showCreate, setShowCreate] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const { data: myTours, refetch } = useQuery({
    queryKey: ["my-tours-tab", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data: tp } = await supabase
        .from("tour_players")
        .select("*, tours(*, clubs!tours_organizer_club_id_fkey(name, logo_url, is_personal))")
        .eq("player_id", userId);

      const { data: ownedTours } = await supabase
        .from("tours")
        .select("*, clubs!tours_organizer_club_id_fkey(name, logo_url, owner_id, is_personal)")
        .eq("organizer_club_id", (await supabase.from("clubs").select("id").eq("owner_id", userId).then(r => r.data?.map(c => c.id) ?? [])).join(",") || "none");

      const fromTp = (tp ?? []).map((t: any) => ({
        ...t.tours, playerRole: t.tours?.clubs?.owner_id === userId ? "organizer" : "player", myStatus: t.status
      }));
      const fromOwned = (ownedTours ?? []).map((t: any) => ({ ...t, playerRole: "organizer" }));
      const all = [...fromTp, ...fromOwned];
      const seen = new Set<string>();
      return all.filter(t => { if (!t?.id || seen.has(t.id)) return false; seen.add(t.id); return true; });
    },
    enabled: !!userId,
  });

  const { data: invitedTours } = useQuery({
    queryKey: ["invited-tours-tab", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data: myClubs } = await supabase.from("members").select("club_id").eq("user_id", userId).in("role", ["owner", "admin"]);
      if (!myClubs?.length) return [];
      const { data } = await supabase.from("tour_clubs")
        .select("*, tours(*, clubs!tours_organizer_club_id_fkey(name))")
        .in("club_id", myClubs.map(m => m.club_id))
        .eq("status", "invited");
      return data ?? [];
    },
    enabled: !!userId,
  });

  const { data: allTours, isLoading } = useQuery({
    queryKey: ["all-tours-tab"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tours")
        .select("*, clubs!tours_organizer_club_id_fkey(name, logo_url)")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  const tourTabs = [
    { id: "mine" as const, label: "My Tours", count: myTours?.length ?? 0 },
    { id: "invited" as const, label: "Invited", count: invitedTours?.length },
    { id: "all" as const, label: "All" },
  ];

  return (
    <div className="px-4 py-3">
      {/* Tab bar + create button */}
      <div className="flex items-center gap-3 mb-4">
        {tourTabs.map(t => (
          <button key={t.id} onClick={() => setTourTab(t.id)}
            className={`text-xs font-bold uppercase tracking-wider transition-colors ${
              tourTab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}>
            {t.label}
            {t.count != null && t.count > 0 && <span className="ml-1 text-primary">({t.count})</span>}
          </button>
        ))}
        <button onClick={() => setShowCreate(true)}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* My Tours */}
      {tourTab === "mine" && (
        <div className="space-y-2">
          {!myTours || myTours.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Trophy className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-semibold">No tournaments yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create a tournament from your club</p>
              <Button size="sm" className="mt-3 gap-1" onClick={() => setShowCreate(true)}>
                + Create Tournament
              </Button>
            </div>
          ) : myTours.map((tour: any, i: number) => (
            <button key={tour.id} onClick={() => navigate(`/tour/${tour.id}`)}
              className="flex w-full items-center gap-3 golf-card p-3 text-left hover:border-primary/30 transition-all">
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarImage src={tour.clubs?.logo_url ?? ""} />
                <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">{tour.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{tour.name}</p>
                <p className="text-[10px] text-muted-foreground">{tour.year} · {tour.clubs?.name ?? "—"}</p>
              </div>
              <Badge variant="outline" className={`text-[9px] ${
                tour.playerRole === "organizer" ? "text-primary border-primary/30" : "text-muted-foreground border-muted-foreground/30"
              }`}>
                {tour.playerRole === "organizer" ? "Organizer →" : `Player`}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {/* Invited */}
      {tourTab === "invited" && (
        <div className="space-y-2">
          {!invitedTours?.length ? (
            <p className="text-xs text-muted-foreground text-center py-8">No pending invitations</p>
          ) : invitedTours.map((tc: any) => {
            const tour = tc.tours;
            return (
              <div key={tc.id} className="golf-card p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{tour?.name}</p>
                  <p className="text-[10px] text-muted-foreground">{tour?.year} · By {tour?.clubs?.name}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs" onClick={async () => {
                    await supabase.from("tour_clubs").update({ status: "accepted" }).eq("id", tc.id);
                    queryClient.invalidateQueries({ queryKey: ["invited-tours-tab"] });
                    navigate(`/tour/${tour?.id}`);
                  }}>Accept</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={async () => {
                    await supabase.from("tour_clubs").update({ status: "declined" }).eq("id", tc.id);
                    queryClient.invalidateQueries({ queryKey: ["invited-tours-tab"] });
                  }}>Decline</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* All */}
      {tourTab === "all" && (
        <div className="space-y-2">
          {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          {!isLoading && !allTours?.length && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No public tournaments</p>
            </div>
          )}
          {allTours?.map((tour: any, i: number) => (
            <button key={tour.id} onClick={() => navigate(`/tour/${tour.id}`)}
              className="flex w-full items-center gap-3 golf-card p-3 text-left hover:border-primary/30 transition-all">
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarImage src={tour.clubs?.logo_url ?? ""} />
                <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">{tour.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold truncate">{tour.name}</p>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                    tour.is_public === false ? "text-amber-500 bg-amber-500/10 border-amber-500/30" : "text-primary/70 bg-primary/10 border-primary/20"
                  }`}>{tour.is_public === false ? "🔒 Private" : "🌐 Public"}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{tour.year} · {tour.clubs?.name ?? "—"} · {tour.tournament_type}</p>
              </div>
              <Button size="sm" variant="outline" className="h-7 rounded-lg px-4 text-[10px] font-bold uppercase tracking-wider shrink-0">View →</Button>
            </button>
          ))}
        </div>
      )}

      <CreateTourDialog open={showCreate} onOpenChange={setShowCreate} onCreated={() => { setShowCreate(false); refetch(); }} />
    </div>
  );
};

export default TournamentsTab;
