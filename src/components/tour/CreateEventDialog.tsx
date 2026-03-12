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

const CreateEventDialog = ({ tourId, open, onOpenChange, onDone }: Props) => {
  const [name, setName] = useState("");
  const [courseId, setCourseId] = useState("");
  const [date, setDate] = useState("");
  const [ticketTotal, setTicketTotal] = useState("60");
  const [loading, setLoading] = useState(false);

  const { data: courses } = useQuery({
    queryKey: ["all-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, name, location").order("name");
      return data ?? [];
    },
  });

  const handleSubmit = async () => {
    if (!name || !courseId || !date) { toast.error("Fill all required fields"); return; }
    setLoading(true);
    const { error } = await supabase.from("events").insert({
      tour_id: tourId,
      course_id: courseId,
      name,
      event_date: date,
      ticket_total: parseInt(ticketTotal) || 0,
      status: "draft",
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Event created");
    setName(""); setDate("");
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Create Event</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Event Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="March Monthly" />
          </div>
          <div>
            <Label className="text-xs">Course</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
              <SelectContent>
                {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Total Tickets</Label>
            <Input type="number" value={ticketTotal} onChange={e => setTicketTotal(e.target.value)} />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating…" : "Create Event"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEventDialog;
