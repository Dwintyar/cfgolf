import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  eventId: string;
  tourId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}

const AssignContestantDialog = ({ eventId, tourId, open, onOpenChange, onDone }: Props) => {
  const [playerId, setPlayerId] = useState("");
  const [status, setStatus] = useState("competitor");
  const [hcp, setHcp] = useState("");
  const [flightId, setFlightId] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: players } = useQuery({
    queryKey: ["tour-players-for-assign", tourId, eventId],
    queryFn: async () => {
      const { data: tourPlayers } = await supabase
        .from("tour_players")
        .select("player_id, hcp_tour, hcp_at_registration, profiles(full_name, handicap)")
        .eq("tour_id", tourId)
        .in("status", ["registered", "active"]);

      const { data: existingContestants } = await supabase
        .from("contestants")
        .select("player_id")
        .eq("event_id", eventId);

      const alreadyAssigned = new Set(
        existingContestants?.map(c => c.player_id) ?? []
      );

      return (tourPlayers ?? []).filter(
        p => !alreadyAssigned.has(p.player_id)
      );
    },
    enabled: open && !!tourId && !!eventId,
  });

  const { data: flights } = useQuery({
    queryKey: ["tour-flights", tourId],
    queryFn: async () => {
      const { data } = await supabase.from("tournament_flights").select("*").eq("tour_id", tourId).order("display_order");
      return data ?? [];
    },
    enabled: open,
  });

  const handleSubmit = async () => {
    if (!playerId) { toast.error("Select a player"); return; }
    setLoading(true);
    const { error } = await supabase.from("contestants").insert({
      event_id: eventId,
      player_id: playerId,
      status,
      hcp: hcp ? parseInt(hcp) : null,
      flight_id: flightId || null,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Contestant added");
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Assign Contestant</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Player</Label>
            <p className="text-[10px] text-muted-foreground mb-1">
              {players?.length ?? 0} player tersedia untuk di-assign
            </p>
            {players?.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                Semua player tournament sudah menjadi contestant.
              </p>
            ) : (
              <Select value={playerId} onValueChange={(v) => {
                setPlayerId(v);
                const p = players?.find(pp => pp.player_id === v);
                if (p) {
                  const tournamentHcp = (p as any).hcp_tour
                    ?? (p as any).hcp_at_registration
                    ?? (p.profiles as any)?.handicap;
                  if (tournamentHcp != null) setHcp(String(tournamentHcp));
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Select player" /></SelectTrigger>
                <SelectContent>
                  {players?.map(p => (
                    <SelectItem key={p.player_id} value={p.player_id}>
                      {(p.profiles as any)?.full_name ?? "Unknown"} (Tour HCP {(p as any).hcp_tour ?? (p as any).hcp_at_registration ?? "—"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="competitor">Competitor</SelectItem>
                <SelectItem value="non_competitor">Non-Competitor</SelectItem>
                <SelectItem value="guest">Guest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">HCP for this event (Tournament HCP)</Label>
            <Input type="number" value={hcp} onChange={e => setHcp(e.target.value)} />
            {playerId && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Personal HCP: {players?.find(p => p.player_id === playerId)
                  ? (players.find(p => p.player_id === playerId)?.profiles as any)?.handicap ?? "—"
                  : "—"}
              </p>
            )}
          </div>
          </div>
          <div>
            <Label className="text-xs">Flight</Label>
            <Select value={flightId || "none"} onValueChange={(v) => setFlightId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Auto or select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {flights?.map(f => <SelectItem key={f.id} value={f.id}>{f.flight_name} ({f.hcp_min}–{f.hcp_max})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? "Adding…" : "Add Contestant"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssignContestantDialog;
