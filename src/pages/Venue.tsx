import { ArrowLeft, MapPin, Star, Wifi, Clock, Ship } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import venueImg from "@/assets/golf-venue.jpg";
import heroImg from "@/assets/golf-hero.jpg";
import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CalendarDays, Users, UserCheck, Car } from "lucide-react";

const Venue = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromClubs = searchParams.get("from") === "clubs";
  const fromClubId = searchParams.get("clubId");
  const { id } = useParams<{ id: string }>();
  const [selectedTime, setSelectedTime] = useState("07:00");
  const [distUnit, setDistUnit] = useState<"yd" | "m">("m");
  const [showBooking, setShowBooking] = useState(false);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingPlayers, setBookingPlayers] = useState("4");
  const [bookingCaddies, setBookingCaddies] = useState("0");
  const [bookingCarts, setBookingCarts] = useState("0");
  const [bookingTee, setBookingTee] = useState("white");
  const [bookingNotes, setBookingNotes] = useState("");
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const queryClient = useQueryClient();

  // Get current user
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserClubId, setCurrentUserClubId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
        const { data } = await supabase.from("members").select("club_id").eq("user_id", user.id).limit(1).single();
        if (data) setCurrentUserClubId(data.club_id);
      }
    });
  }, []);

  const handleSubmitBooking = async () => {
    if (!bookingDate || !selectedTime) {
      toast.error("Pilih tanggal dan tee time terlebih dahulu");
      return;
    }
    if (!currentUserId) { toast.error("Login required"); return; }
    setSubmittingBooking(true);
    try {
      // Get venue club_id for this course
      const { data: courseData } = await supabase
        .from("courses").select("club_id").eq("id", id!).single();
      if (!courseData?.club_id) throw new Error("Venue not found");

      const { error } = await supabase.from("venue_bookings").insert({
        venue_club_id: courseData.club_id,
        course_id: id,
        organizer_club_id: currentUserClubId,
        requested_by: currentUserId,
        status: "pending",
        notes: `Date: ${bookingDate} | Time: ${selectedTime} | Players: ${bookingPlayers} | Caddies: ${bookingCaddies} | Carts: ${bookingCarts} | Tee: ${bookingTee}${bookingNotes ? " | Notes: " + bookingNotes : ""}`,
        green_fee_agreed: null,
      });
      if (error) throw error;

      // Send notification to venue
      await supabase.from("notifications").insert({
        user_id: currentUserId, // will be updated to venue owner
        title: "New Booking Request",
        message: `Booking request for ${course?.name} on ${bookingDate} at ${selectedTime}`,
        type: "booking",
      });

      toast.success("Booking request sent! Venue will confirm shortly.");
      setShowBooking(false);
      setBookingDate(""); setBookingNotes("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to submit booking");
    } finally {
      setSubmittingBooking(false);
    }
  };

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, course_holes(*), course_tees(*)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: slotConfig } = useQuery({
    queryKey: ["tee-slot-config-public", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tee_time_slots")
        .select("*")
        .eq("course_id", id!)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const teeTimes = useMemo(() => {
    if (!slotConfig) return ["07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "13:00", "14:00", "15:00"];
    const slots: string[] = [];
    const [sh, sm] = slotConfig.start_time.split(":").map(Number);
    const [eh, em] = slotConfig.end_time.split(":").map(Number);
    let mins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    while (mins <= endMins) {
      const h = Math.floor(mins / 60).toString().padStart(2, "0");
      const m = (mins % 60).toString().padStart(2, "0");
      slots.push(`${h}:${m}`);
      mins += slotConfig.interval_mins;
    }
    return slots;
  }, [slotConfig]);

  const convertDist = (yards: number | null) => {
    if (!yards) return "—";
    if (distUnit === "m") return Math.round(yards * 0.9144).toLocaleString();
    return yards.toLocaleString();
  };

  const totalYards = course?.course_holes?.reduce(
    (sum: number, h: any) => sum + (h.distance_yards ?? 0),
    0
  ) ?? 0;

  const formatPrice = (price: number | null) => {
    if (!price) return null;
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(price));
  };

  const price = course?.green_fee_price ? formatPrice(Number(course.green_fee_price)) : null;

  return (
    <div className="bottom-nav-safe">
      {/* Hero image with overlay info like reference GD_Mob_61 */}
      <div className="relative">
        <img
          src={course?.image_url || venueImg}
          alt="Venue"
          className="h-56 w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <button
          onClick={() => {
            if (fromClubs && fromClubId) {
              // Navigate back to club profile within iframe context
              window.location.href = `/clubs/${fromClubId}?embedded=1`;
            } else {
              navigate(-1);
            }
          }}
          className="absolute left-4 top-4 rounded-full bg-background/60 p-2 backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Course info overlay at bottom of hero */}
        <div className="absolute bottom-4 left-4 right-4">
          {!isLoading && (
            <>
              <h1 className="font-display text-2xl font-bold drop-shadow-lg">
                {course?.name ?? "Golf Course"}
              </h1>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4].map((s) => (
                    <Star key={s} className="h-3 w-3 fill-accent text-accent" />
                  ))}
                  <Star className="h-3 w-3 text-accent/40" />
                </div>
                {course?.location && (
                  <span className="flex items-center gap-1 text-xs text-foreground/80">
                    <MapPin className="h-3 w-3" /> {course.location}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="px-4 pt-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <>
            {/* Price + Tips row like reference */}
            <div className="flex gap-4">
              <div>
                {price && (
                  <p className="text-3xl font-bold text-primary">{price}</p>
                )}
                <Badge variant="outline" className="mt-2 border-primary/30 text-xs uppercase tracking-wider">
                  {new Date().toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })}
                </Badge>
              </div>
              <div className="flex-1 space-y-1.5">
                <p className="text-sm font-semibold">Tips</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Wifi className="h-3.5 w-3.5 text-primary" /> WiFi tersedia
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Ship className="h-3.5 w-3.5 text-primary" /> Cart tersedia
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Lebih sepi sebelum jam 12
                </div>
              </div>
              {/* Favorite button */}
              <button className="self-start flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                <Star className="h-5 w-5 fill-current" />
              </button>
            </div>

            {/* Distance unit toggle */}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm font-semibold">
                {course?.holes_count ?? 18} Holes · Par {course?.par ?? "—"} · {convertDist(totalYards)} {distUnit}
              </p>
              <div className="flex rounded-lg border border-border/50 overflow-hidden">
                <button
                  onClick={() => setDistUnit("yd")}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${distUnit === "yd" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
                >
                  Yard
                </button>
                <button
                  onClick={() => setDistUnit("m")}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${distUnit === "m" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
                >
                  Meter
                </button>
              </div>
            </div>

            {/* Course Tees */}
            {course?.course_tees && (course.course_tees as any[]).length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-semibold mb-3">Tee Options</p>
                <div className="grid grid-cols-2 gap-2">
                  {(course.course_tees as any[]).map((tee: any) => (
                    <div key={tee.id} className="golf-card p-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full border border-border"
                          style={{ backgroundColor: tee.color === "white" ? "#f0f0f0" : tee.color }}
                        />
                        <span className="text-sm font-semibold">{tee.tee_name}</span>
                      </div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        Rating {tee.rating ?? "—"} · Slope {tee.slope ?? "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tee time selection */}
            <div className="mt-6">
              <p className="text-sm font-semibold mb-3">Pilih waktu tee-off</p>
              <div className="grid grid-cols-3 gap-2">
                {teeTimes.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`rounded-xl py-2.5 text-sm font-medium transition-all ${
                      selectedTime === time
                        ? "bg-primary text-primary-foreground golf-glow"
                        : "golf-card hover:border-primary/30"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>

              {/* Book This Course button */}
              <Button
                className="w-full mt-4 h-12 text-base font-bold gap-2"
                onClick={() => setShowBooking(true)}
              >
                <CalendarDays className="h-5 w-5" />
                Book This Course
              </Button>
            </div>

            {/* Hole Details */}
            {course?.course_holes && course.course_holes.length > 0 && (
              <>
                <h2 className="mt-6 mb-3 font-display text-lg font-semibold">
                  Hole Details
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {(course.course_holes as any[])
                    .sort((a, b) => a.hole_number - b.hole_number)
                    .map((hole, i) => (
                      <div
                        key={hole.id}
                        className="golf-card flex items-center justify-between p-3 animate-fade-in"
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <div>
                          <p className="text-sm font-semibold">Hole {hole.hole_number}</p>
                          <p className="text-xs text-muted-foreground">
                            Par {hole.par}
                            {hole.distance_yards ? ` · ${convertDist(hole.distance_yards)} ${distUnit}` : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </>
            )}

            {/* Gallery strip like reference */}
            <div className="mt-6 flex gap-1.5 overflow-x-auto pb-2 -mx-4 px-4">
              {[venueImg, heroImg, venueImg, heroImg].map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Gallery ${i + 1}`}
                  className="h-20 w-24 flex-shrink-0 rounded-lg object-cover"
                />
              ))}
            </div>


          </>
        )}
      </div>

      {/* Booking Dialog */}
      <Dialog open={showBooking} onOpenChange={setShowBooking}>
        <DialogContent className="max-w-md mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Book {course?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Date */}
            <div className="space-y-1.5">
              <Label className="text-sm">Date</Label>
              <Input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]} />
            </div>

            {/* Tee time — already selected */}
            <div className="space-y-1.5">
              <Label className="text-sm">Tee Time</Label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary/10 border border-primary/20">
                <span className="text-primary font-bold">{selectedTime}</span>
                <span className="text-xs text-muted-foreground">(selected from tee time)</span>
              </div>
            </div>

            {/* Players, Caddies, Carts */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Users className="h-3 w-3" />Players</Label>
                <Input type="number" min="1" max="200" value={bookingPlayers}
                  onChange={e => setBookingPlayers(e.target.value)} className="text-center" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><UserCheck className="h-3 w-3" />Caddies</Label>
                <Input type="number" min="0" max="100" value={bookingCaddies}
                  onChange={e => setBookingCaddies(e.target.value)} className="text-center" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Car className="h-3 w-3" />Carts</Label>
                <Input type="number" min="0" max="100" value={bookingCarts}
                  onChange={e => setBookingCarts(e.target.value)} className="text-center" />
              </div>
            </div>

            {/* Tee selection */}
            <div className="space-y-1.5">
              <Label className="text-sm">Tee</Label>
              <Select value={bookingTee} onValueChange={setBookingTee}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(course?.course_tees as any[] ?? []).map((tee: any) => (
                    <SelectItem key={tee.id} value={tee.color}>
                      <span className="capitalize">{tee.color}</span>
                      {tee.course_rating && ` · Rating ${tee.course_rating} · Slope ${tee.slope_rating}`}
                    </SelectItem>
                  ))}
                  {!(course?.course_tees as any[])?.length && (
                    <SelectItem value="white">White (Default)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-sm">Notes (optional)</Label>
              <Textarea placeholder="Tournament name, special requests..." value={bookingNotes}
                onChange={e => setBookingNotes(e.target.value)} className="resize-none" rows={2} />
            </div>

            {/* Green fee estimate */}
            {course?.green_fee_price && (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-secondary/50 border border-border/50">
                <span className="text-sm text-muted-foreground">Estimated Green Fee</span>
                <span className="text-sm font-bold text-primary">
                  Rp {(Number(course.green_fee_price) * Number(bookingPlayers)).toLocaleString("id-ID")}
                </span>
              </div>
            )}

            <Button className="w-full h-11 font-bold" onClick={handleSubmitBooking} disabled={submittingBooking}>
              {submittingBooking ? "Submitting..." : "Send Booking Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Venue;
