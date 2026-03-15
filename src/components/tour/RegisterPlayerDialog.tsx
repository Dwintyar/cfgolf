import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  tourId: string;
  tourType: string;
  organizerClubId: string;
  callerClubId?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}

const RegisterPlayerDialog = ({ tourId, tourType, organizerClubId, callerClubId, open, onOpenChange, onDone }: Props) => {
  const isOrganizer = !callerClubId || callerClubId === organizerClubId;
  const [clubId, setClubId] = useState(organizerClubId);
  const [playerId, setPlayerId] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (callerClubId) {
      setClubId(callerClubId);
      setPlayerId("");
      setPlayerSearch("");
    }
  }, [callerClubId]);

  useEffect(() => {
    if (open) {
      setClubId(callerClubId ?? organizerClubId);
      setPlayerId("");
      setPlayerSearch("");
    }
  }, [open, callerClubId, organizerClubId]);

  // For organizer: show participating clubs (accepted in tour_clubs)
  const { data: participatingClubs } = useQuery({
    queryKey: ["tour-participating-clubs", tourId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tour_clubs")
        .select("club_id, clubs(id, name)")
        .eq("tour_id", tourId)
        .eq("status", "accepted");
      return data?.map(tc => tc.clubs).filter(Boolean) ?? [];
    },
    enabled: !!tourId && isOrganizer,
  });

  const { data: members } = useQuery({
    queryKey: ["dialog-members", clubId],
    queryFn: async () => {
      const { data } = await supabase
        .from("members")
        .select("user_id, profiles(id, full_name, handicap)")
        .eq("club_id", clubId);
      return data ?? [];
    },
    enabled: !!clubId,
  });

  const sortedAndFiltered = (members ?? [])
    .filter(m =>
      (m.profiles as any)?.full_name?.toLowerCase()
        .includes(playerSearch.toLowerCase())
    )
    .sort((a, b) => {
      const nameA = ((a.profiles as any)?.full_name ?? "").toLowerCase();
      const nameB = ((b.profiles as any)?.full_name ?? "").toLowerCase();
      return nameA.localeCompare(nameB, "id");
    });

  const handleSubmit = async () => {
    if (!playerId || !clubId) { toast.error("Select a player"); return; }
    setLoading(true);
    const { error } = await supabase.from("tour_players").insert({
      tour_id: tourId,
      club_id: clubId,
      player_id: playerId,
      status: "active",
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Player registered");
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Register Player</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {/* Club selector: only for organizer in interclub */}
          {isOrganizer && tourType === "interclub" && (
            <div>
              <Label className="text-xs">Club</Label>
              <Select value={clubId} onValueChange={(v) => { setClubId(v); setPlayerId(""); setPlayerSearch(""); }}>
                <SelectTrigger><SelectValue placeholder="Select club" /></SelectTrigger>
                <SelectContent>
                  {participatingClubs?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Player search + list */}
          <div>
            <Label className="text-xs">Player</Label>
            <Input
              placeholder="Cari nama member..."
              value={playerSearch}
              onChange={e => setPlayerSearch(e.target.value)}
              className="h-8 text-xs mt-1 mb-1"
            />
            <p className="text-[10px] text-muted-foreground mb-1">
              {playerSearch
                ? `${sortedAndFiltered.length} dari ${members?.length ?? 0} member`
                : `${members?.length ?? 0} member — pilih satu`}
            </p>
            <div className="max-h-48 overflow-y-auto border rounded-lg divide-y divide-border/30">
              {sortedAndFiltered.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  {playerSearch ? "Tidak ditemukan" : "Tidak ada member"}
                </p>
              )}
              {sortedAndFiltered.map(m => {
                const profile = m.profiles as any;
                const isSelected = playerId === m.user_id;
                return (
                  <button
                    key={m.user_id}
                    onClick={() => setPlayerId(m.user_id)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between
                      hover:bg-secondary/50 transition-colors
                      ${isSelected ? "bg-primary/10 text-primary font-semibold" : ""}`}
                  >
                    <span>{profile?.full_name ?? "Unknown"}</span>
                    <span className="text-muted-foreground">HCP {profile?.handicap ?? "—"}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? "Registering…" : "Register Player"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RegisterPlayerDialog;
