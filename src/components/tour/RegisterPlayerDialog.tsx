import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  tourId: string;
  tourType: string;
  organizerClubId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}

const RegisterPlayerDialog = ({ tourId, tourType, organizerClubId, open, onOpenChange, onDone }: Props) => {
  const [clubId, setClubId] = useState(organizerClubId);
  const [playerId, setPlayerId] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: clubs } = useQuery({
    queryKey: ["all-clubs"],
    queryFn: async () => {
      const { data } = await supabase.from("clubs").select("id, name").order("name");
      return data ?? [];
    },
  });

  const { data: members } = useQuery({
    queryKey: ["club-members", clubId],
    queryFn: async () => {
      const { data } = await supabase
        .from("members")
        .select("user_id, profiles(id, full_name, handicap)")
        .eq("club_id", clubId);
      return data ?? [];
    },
    enabled: !!clubId,
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
          {tourType === "interclub" && (
            <div>
              <Label className="text-xs">Club</Label>
              <Select value={clubId} onValueChange={(v) => { setClubId(v); setPlayerId(""); }}>
                <SelectTrigger><SelectValue placeholder="Select club" /></SelectTrigger>
                <SelectContent>
                  {clubs?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs">Player</Label>
            <Select value={playerId} onValueChange={setPlayerId}>
              <SelectTrigger><SelectValue placeholder="Select player" /></SelectTrigger>
              <SelectContent>
                {members?.map(m => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {(m.profiles as any)?.full_name ?? "Unknown"} (HCP {(m.profiles as any)?.handicap ?? "—"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
