import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface Props {
  tourId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const ManageFlightsDialog = ({ tourId, open, onOpenChange }: Props) => {
  const [name, setName] = useState("");
  const [min, setMin] = useState("0");
  const [max, setMax] = useState("10");
  const [loading, setLoading] = useState(false);

  const { data: flights, refetch } = useQuery({
    queryKey: ["tour-flights", tourId],
    queryFn: async () => {
      const { data } = await supabase.from("tournament_flights").select("*").eq("tour_id", tourId).order("display_order");
      return data ?? [];
    },
    enabled: open,
  });

  const handleAdd = async () => {
    if (!name) { toast.error("Name required"); return; }
    setLoading(true);
    const { error } = await supabase.from("tournament_flights").insert({
      tour_id: tourId,
      flight_name: name,
      hcp_min: parseInt(min),
      hcp_max: parseInt(max),
      display_order: (flights?.length ?? 0) + 1,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setName(""); setMin("0"); setMax("10");
    refetch();
  };

  const handleDelete = async (fid: string) => {
    await supabase.from("tournament_flights").delete().eq("id", fid);
    refetch();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Flights</DialogTitle></DialogHeader>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {flights?.map(f => (
            <div key={f.id} className="flex items-center justify-between rounded-lg border border-border/50 p-2">
              <span className="text-sm">{f.flight_name} ({f.hcp_min}–{f.hcp_max})</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDelete(f.id)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
        <div className="space-y-2 border-t border-border/50 pt-3">
          <Label className="text-xs">Add Flight</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Flight A" />
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-[10px]">HCP Min</Label>
              <Input type="number" value={min} onChange={e => setMin(e.target.value)} />
            </div>
            <div className="flex-1">
              <Label className="text-[10px]">HCP Max</Label>
              <Input type="number" value={max} onChange={e => setMax(e.target.value)} />
            </div>
          </div>
          <Button size="sm" className="w-full" onClick={handleAdd} disabled={loading}>Add Flight</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManageFlightsDialog;
