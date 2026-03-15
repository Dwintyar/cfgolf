import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
  defaultOrganizerClubId?: string;
}

const CreateTourDialog = ({ open, onOpenChange, onCreated }: Props) => {
  const [name, setName] = useState("");
  const [type, setType] = useState("internal");
  const [clubId, setClubId] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: clubs } = useQuery({
    queryKey: ["all-clubs"],
    queryFn: async () => {
      const { data } = await supabase.from("clubs").select("id, name").order("name");
      return data ?? [];
    },
  });

  const handleSubmit = async () => {
    if (!name || !clubId) { toast.error("Name and organizer club are required"); return; }
    setLoading(true);
    const { error } = await supabase.from("tours").insert({
      name,
      tournament_type: type,
      organizer_club_id: clubId,
      year: parseInt(year),
      description: description || null,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tour created");
    setName(""); setDescription("");
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Create Tournament</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Spring Championship" />
          </div>
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="interclub">Interclub</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Organizer Club</Label>
            <Select value={clubId} onValueChange={setClubId}>
              <SelectTrigger><SelectValue placeholder="Select club" /></SelectTrigger>
              <SelectContent>
                {clubs?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Year</Label>
            <Input type="number" value={year} onChange={e => setYear(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating…" : "Create Tour"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTourDialog;
