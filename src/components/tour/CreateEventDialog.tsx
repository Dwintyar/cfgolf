import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
  const [ticketTotal, setTicketTotal] = useState("0");
  const [pairingApproval, setPairingApproval] = useState(false);
  const [pairingMode, setPairingMode] = useState("self");
  const [loading, setLoading] = useState(false);

  const { data: courses } = useQuery({
    queryKey: ["all-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, name, location").order("name");
      if (!data) return [];
      const seen = new Set<string>();
      return data.filter((c: any) => {
        const key = c.name.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
  });

  const handleSubmit = async () => {
    if (!name || !courseId || !date) { toast.error("Fill all required fields"); return; }
    setLoading(true);
    const { data: newEvent, error } = await supabase.from("events").insert({
      tour_id: tourId,
      course_id: courseId,
      name,
      event_date: date,
      ticket_total: parseInt(ticketTotal) || 0,
      status: "draft",
      pairing_approval_required: pairingApproval,
      pairing_mode: pairingMode,
    }).select("id").single();
    if (error || !newEvent) { setLoading(false); toast.error(error?.message ?? "Failed"); return; }

    // Snapshot holes dari course ke event
    const { data: courseHoles } = await supabase
      .from("course_holes")
      .select("hole_number, par, distance_yards, handicap_index")
      .eq("course_id", courseId)
      .order("hole_number");

    if (courseHoles && courseHoles.length > 0) {
      await supabase.from("event_holes").insert(
        courseHoles.map(h => ({
          event_id: newEvent.id,
          hole_number: h.hole_number,
          par: h.par,
          distance_yards: h.distance_yards,
          stroke_index: h.handicap_index,
        }))
      );
    }

    setLoading(false);
    toast.success("Event created");
    setName(""); setDate(""); setPairingApproval(false); setPairingMode("self");
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Create Event</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Event Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. March Monthly" />
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
          <div>
            <Label className="text-xs">Pairing Mode</Label>
            <Select value={pairingMode} onValueChange={setPairingMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="self">
                  👤 Self — Tentukan sendiri group & pasangan
                </SelectItem>
                <SelectItem value="open">
                  🌐 Open — Minta golf course untuk memasangkan
                </SelectItem>
                <SelectItem value="course_arranged">
                  🏌️ Course Arranged — Sepenuhnya diatur golf course
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">
              {pairingMode === "self" && "Kamu atur sendiri siapa yang main bersama"}
              {pairingMode === "open" && "Golf course akan mencarikan pasangan bermain untukmu"}
              {pairingMode === "course_arranged" && "Golf course mengatur sepenuhnya: cart, caddy, tee time, start hole"}
            </p>
          </div>
          {pairingMode === "self" && (
            <div className="golf-card p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Pairing Approval</p>
                <p className="text-xs text-muted-foreground">Review pairing sebelum dipublikasi</p>
              </div>
              <Switch checked={pairingApproval} onCheckedChange={setPairingApproval} />
            </div>
          )}
          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating…" : "Create Event"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEventDialog;
