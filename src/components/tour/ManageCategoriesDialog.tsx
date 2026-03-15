import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface Props {
  tourId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const ManageCategoriesDialog = ({ tourId, open, onOpenChange }: Props) => {
  const [name, setName] = useState("");
  const [flightId, setFlightId] = useState<string>("");
  const [rankCount, setRankCount] = useState("1");
  const [calcType, setCalcType] = useState("net");
  const [loading, setLoading] = useState(false);

  const { data: categories, refetch } = useQuery({
    queryKey: ["tour-categories", tourId],
    queryFn: async () => {
      const { data } = await supabase.from("tournament_winner_categories")
        .select("*, tournament_flights(flight_name)")
        .eq("tour_id", tourId)
        .order("display_order");
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

  const handleAdd = async () => {
    if (!name) { toast.error("Name required"); return; }
    setLoading(true);
    const { error } = await supabase.from("tournament_winner_categories").insert({
      tour_id: tourId,
      category_name: name,
      flight_id: flightId || null,
      rank_count: parseInt(rankCount),
      calculation_type: calcType,
      display_order: (categories?.length ?? 0) + 1,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setName("");
    refetch();
  };

  const handleDelete = async (cid: string) => {
    await supabase.from("tournament_winner_categories").delete().eq("id", cid);
    refetch();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Winner Categories</DialogTitle></DialogHeader>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {categories?.map(c => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-border/50 p-2">
              <div>
                <p className="text-sm">{c.category_name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {c.calculation_type} · Top {c.rank_count} {(c.tournament_flights as any)?.flight_name ? `· ${(c.tournament_flights as any).flight_name}` : ""}
                </p>
              </div>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDelete(c.id)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
        <div className="space-y-2 border-t border-border/50 pt-3">
          <Label className="text-xs">Add Category</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Best Net Overall" />
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-[10px]">Calculation</Label>
              <Select value={calcType} onValueChange={setCalcType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gross">Gross</SelectItem>
                  <SelectItem value="net">Net</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-[10px]">Top N</Label>
              <Input type="number" value={rankCount} onChange={e => setRankCount(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
          <div>
            <Label className="text-[10px]">Flight (optional)</Label>
            <Select value={flightId || "none"} onValueChange={(v) => setFlightId(v === "none" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All flights" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All flights</SelectItem>
                {flights?.map(f => <SelectItem key={f.id} value={f.id}>{f.flight_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" className="w-full" onClick={handleAdd} disabled={loading}>Add Category</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManageCategoriesDialog;
