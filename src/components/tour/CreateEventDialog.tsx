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
import { CalendarIcon, Building2, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useRef } from "react";

interface Props {
  tourId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
  isPersonal?: boolean;
  organizerClubId?: string;
}

const CreateEventDialog = ({ tourId, open, onOpenChange, onDone, isPersonal = false, organizerClubId }: Props) => {
  const [name, setName] = useState("");
  const [courseId, setCourseId] = useState("");
  const [date, setDate] = useState("");
  const [ticketTotal, setTicketTotal] = useState("0");
  const [pairingApproval, setPairingApproval] = useState(false);
  const [pairingMode, setPairingMode] = useState("self");
  const [loading, setLoading] = useState(false);

  // Booking request state
  const [showBooking, setShowBooking] = useState(false);
  const [bookingPlayers, setBookingPlayers] = useState("4");
  const [bookingCaddies, setBookingCaddies] = useState("4");
  const [bookingCarts, setBookingCarts] = useState("2");
  const [bookingTime, setBookingTime] = useState("07:00");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingDone, setBookingDone] = useState(false);

  const { data: courses } = useQuery({
    queryKey: ["all-courses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, name, location, club_id, clubs(id, name, logo_url, club_type)")
        .order("name");
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

  const selectedCourse = courses?.find((c: any) => c.id === courseId);
  const venueClub = (selectedCourse as any)?.clubs;
  const isVenueClub = venueClub?.club_type === "venue";

  // Reset booking when course changes
  const handleCourseChange = (id: string) => {
    setCourseId(id);
    setShowBooking(false);
    setBookingDone(false);
  };

  const handleBookingRequest = async () => {
    if (!courseId || !date || !organizerClubId) {
      toast.error("Pilih course dan tanggal event dulu");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setBookingLoading(true);
    const notes = `Date: ${date} | Time: ${bookingTime} | Players: ${bookingPlayers} | Caddies: ${bookingCaddies} | Carts: ${bookingCarts}${bookingNotes ? " | Notes: " + bookingNotes : ""}`;
    const { error } = await supabase.from("venue_bookings").insert({
      venue_club_id: venueClub.id,
      course_id: courseId,
      organizer_club_id: organizerClubId,
      requested_by: user.id,
      status: "pending",
      notes,
    });
    setBookingLoading(false);
    if (error) {
      toast.error("Gagal mengirim booking request");
      return;
    }
    setBookingDone(true);
    setShowBooking(false);
    toast.success("Booking request terkirim ke venue ✓");

    // Notify venue
    await supabase.from("notifications").insert({
      user_id: user.id,
      title: "Booking Request Sent",
      message: `Your booking request for ${selectedCourse?.name} on ${date} has been sent to ${venueClub.name}.`,
      type: "booking",
    });
  };

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
    setBookingDone(false); setShowBooking(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Event</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Event Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. March Monthly" />
          </div>

          {/* Course selector */}
          <div>
            <Label className="text-xs">Course</Label>
            <Select value={courseId} onValueChange={handleCourseChange}>
              <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
              <SelectContent>
                {courses?.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}{c.location ? ` — ${c.location}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Venue info + booking request */}
            {courseId && isVenueClub && (
              <div className="mt-2 rounded-xl border border-border bg-secondary/30 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg overflow-hidden bg-primary/10 shrink-0 flex items-center justify-center">
                    {venueClub?.logo_url
                      ? <img src={venueClub.logo_url} className="h-full w-full object-cover" />
                      : <Building2 className="h-4 w-4 text-primary/60" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{venueClub.name}</p>
                    <p className="text-[11px] text-muted-foreground">{(selectedCourse as any)?.location ?? "—"}</p>
                  </div>
                  {bookingDone
                    ? <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">✓ Requested</span>
                    : (
                      <button
                        onClick={() => setShowBooking(v => !v)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
                      >
                        Book Venue {showBooking ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    )}
                </div>

                {/* Booking form */}
                {showBooking && !bookingDone && (
                  <div className="space-y-2 pt-1 border-t border-border/50">
                    <p className="text-[11px] text-muted-foreground">Kirim booking request ke {venueClub.name}</p>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Tee Time</p>
                        <Input type="time" value={bookingTime} onChange={e => setBookingTime(e.target.value)}
                          className="h-8 text-xs" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Players</p>
                        <Input type="number" value={bookingPlayers} onChange={e => setBookingPlayers(e.target.value)}
                          className="h-8 text-xs" min="1" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Caddies</p>
                        <Input type="number" value={bookingCaddies} onChange={e => setBookingCaddies(e.target.value)}
                          className="h-8 text-xs" min="0" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Carts</p>
                        <Input type="number" value={bookingCarts} onChange={e => setBookingCarts(e.target.value)}
                          className="h-8 text-xs" min="0" />
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Notes (optional)</p>
                      <Input value={bookingNotes} onChange={e => setBookingNotes(e.target.value)}
                        placeholder="Permintaan khusus..." className="h-8 text-xs" />
                    </div>

                    <p className="text-[10px] text-muted-foreground">
                      Tanggal mengikuti Event Date yang dipilih. Isi tanggal event dulu jika belum.
                    </p>

                    <Button size="sm" className="w-full h-8 text-xs"
                      disabled={bookingLoading || !date}
                      onClick={handleBookingRequest}>
                      {bookingLoading ? "Mengirim..." : "Kirim Booking Request"}
                    </Button>
                  </div>
                )}
              </div>
            )}
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
