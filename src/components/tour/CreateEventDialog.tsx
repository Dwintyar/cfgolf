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
import { CalendarIcon } from "lucide-react";
import { useRef } from "react";

interface Props {
  tourId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
  isPersonal?: boolean;
}

const CreateEventDialog = ({ tourId, open, onOpenChange, onDone, isPersonal = false }: Props) => {
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
      ticket_total: isPersonal ? 1 : (parseInt(ticketTotal) || 0),
      status: "scheduled",
      pairing_approval_required: isPersonal ? false : pairingApproval,
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
            <Label className="text-xs">Event Date</Label>
            <div className="relative">
              <div className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm bg-background border-input ${date ? "text-foreground" : "text-muted-foreground"}`}>
                <span>
                  {date
                    ? new Date(date + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
                    : "Select date..."}
                </span>
                <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground pointer-events-none" />
              </div>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
          {!isPersonal && (
            <div>
              <Label className="text-xs">Total Tickets</Label>
              <Input type="number" value={ticketTotal} onChange={e => setTicketTotal(e.target.value)} />
            </div>
          )}
          {/* Pairing Mode — always shown */}
          <div>
            <Label className="text-xs">Pairing Mode</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {[
                { value: "self", icon: "👤", label: "Solo", desc: isPersonal ? "Play alone" : "Self-arranged" },
                { value: "open", icon: "🌐", label: "Open", desc: "Course pairs you" },
                { value: "course_arranged", icon: "🏌️", label: "Arranged", desc: "Course arranges all" },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPairingMode(opt.value)}
                  className={`rounded-xl border p-2.5 text-center transition-all ${
                    pairingMode === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <div className="text-base">{opt.icon}</div>
                  <p className="text-[11px] font-semibold mt-0.5">{opt.label}</p>
                  <p className="text-[9px] opacity-60 mt-0.5 leading-tight">{opt.desc}</p>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {pairingMode === "self" && (isPersonal ? "You will play alone or arrange your own group." : "You arrange your own groups and pairings.")}
              {pairingMode === "open" && "The golf course will pair you with other players at the same tee time."}
              {pairingMode === "course_arranged" && "The golf course fully arranges your cart, caddy, tee time, and start hole."}
            </p>
          </div>
          {/* Pairing Approval — internal/interclub + self mode only */}
          {!isPersonal && pairingMode === "self" && (
            <div className="golf-card p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Pairing Approval</p>
                <p className="text-xs text-muted-foreground">Review pairings before publishing</p>
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
