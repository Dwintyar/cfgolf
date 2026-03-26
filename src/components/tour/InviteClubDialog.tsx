import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  tourId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}

const InviteClubDialog = ({ tourId, open, onOpenChange, onDone }: Props) => {
  const [clubId, setClubId] = useState("");
  const [quota, setQuota] = useState("10");
  const [loading, setLoading] = useState(false);

  const { data: clubs } = useQuery({
    queryKey: ["all-clubs"],
    queryFn: async () => {
      const { data } = await supabase.from("clubs").select("id, name").order("name");
      return data ?? [];
    },
  });

  const handleSubmit = async () => {
    if (!clubId) { toast.error("Please select a club"); return; }
    setLoading(true);
    const { error } = await supabase.from("tour_clubs").insert({
      tour_id: tourId,
      club_id: clubId,
      ticket_quota: parseInt(quota) || 0,
      status: "invited",
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Club invited");
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Invite Club</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Club</Label>
            <Select value={clubId} onValueChange={setClubId}>
              <SelectTrigger><SelectValue placeholder="Select club" /></SelectTrigger>
              <SelectContent>
                {clubs?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Ticket Quota</Label>
            <Input type="number" value={quota} onChange={e => setQuota(e.target.value)} />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? "Inviting…" : "Invite Club"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteClubDialog;
