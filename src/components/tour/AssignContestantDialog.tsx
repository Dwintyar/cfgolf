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
    queryKey: ["tour-players", tourId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tour_players")
        .select("player_id, profiles(full_name, handicap)")
        .eq("tour_id", tourId)
        .eq("status", "active");
      return data ?? [];
    },
    enabled: open,
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
            <Select value={playerId} onValueChange={(v) => {
              setPlayerId(v);
              const p = players?.find(pp => pp.player_id === v);
              if (p && (p.profiles as any)?.handicap != null) setHcp(String((p.profiles as any).handicap));
            }}>
              <SelectTrigger><SelectValue placeholder="Select player" /></SelectTrigger>
              <SelectContent>
                {players?.map(p => (
                  <SelectItem key={p.player_id} value={p.player_id}>
                    {(p.profiles as any)?.full_name ?? "Unknown"} (HCP {(p.profiles as any)?.handicap ?? "—"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Label className="text-xs">HCP for this event</Label>
            <Input type="number" value={hcp} onChange={e => setHcp(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Flight</Label>
            <Select value={flightId} onValueChange={setFlightId}>
              <SelectTrigger><SelectValue placeholder="Auto or select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
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
