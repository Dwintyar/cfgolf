import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Star, Users, CheckCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import venueImg from "@/assets/golf-venue.jpg";
import { toast } from "sonner";
import { useTier } from "@/hooks/use-tier";
import UpgradeDialog from "@/components/UpgradeDialog";
import { useFeatureFlags } from "@/hooks/use-feature-flags";

const BookTeeTime = () => {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const [userId, setUserId] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { hasFeature } = useTier(userId);
  const { flags } = useFeatureFlags();
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [players, setPlayers] = useState(1);
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/login", { replace: true });
      else setUserId(session.user.id);
    });
  }, [navigate]);

  const { data: course } = useQuery({
    queryKey: ["course-booking", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: slotConfig } = useQuery({
    queryKey: ["slot-config-book", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tee_time_slots")
        .select("*")
        .eq("course_id", courseId!)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!courseId,
  });

  const timeSlots = useMemo(() => {
    if (!slotConfig) return [
      "06:00","06:30","07:00","07:30","08:00","08:30",
      "09:00","09:30","10:00","10:30","11:00","11:30",
      "12:00","12:30","13:00","13:30","14:00","14:30","15:00"
    ];
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

  const isWeekend = useMemo(() => {
    const d = new Date(selectedDate);
    return d.getDay() === 0 || d.getDay() === 6;
  }, [selectedDate]);

  // Get existing bookings for the selected date to show availability
  const { data: existingBookings } = useQuery({
    queryKey: ["bookings", courseId, selectedDate],
    queryFn: async () => {
      const { data } = await supabase
        .from("tee_time_bookings")
        .select("tee_time, players_count")
        .eq("course_id", courseId!)
        .eq("booking_date", selectedDate)
        .eq("status", "confirmed");
      return data ?? [];
    },
    enabled: !!courseId && !!selectedDate,
  });

  const bookedTimes = new Set(
    existingBookings?.filter((b) => b.players_count >= (slotConfig?.max_players ?? 4)).map((b) => b.tee_time.slice(0, 5)) ?? []
  );

  const formatPrice = (price: number | null | undefined) => {
    if (!price) return null;
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(price));
  };

  const displayPrice = isWeekend
    ? (slotConfig?.price_weekend ?? (course?.green_fee_price ? Number(course.green_fee_price) : 0))
    : (slotConfig?.price_weekday ?? (course?.green_fee_price ? Number(course.green_fee_price) : 0));
  const totalPrice = displayPrice * players;

  const handleBook = async () => {
    if (!userId || !courseId || !selectedTime) return;
    setBooking(true);

    // Save tee time booking
    const { error } = await supabase.from("tee_time_bookings").insert({
      course_id: courseId,
      user_id: userId,
      booking_date: selectedDate,
      tee_time: selectedTime,
      players_count: players,
      total_price: totalPrice,
      notes: notes || null,
      status: "pending",
    });

    if (error) {
      setBooking(false);
      toast.error(error.message);
      return;
    }


    setBooking(false);
    setConfirmed(true);
    toast.success("Booking request sent!");
  };

  if (!flags.venue_booking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <div className="animate-fade-in space-y-4">
          <div className="text-5xl">⛳</div>
          <h1 className="font-display text-2xl font-bold">Tee Time Booking</h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Online tee time booking is coming soon. Please contact the venue directly to book your tee time.
          </p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            ← Back to Course
          </Button>
        </div>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <div className="animate-fade-in">
          <CheckCircle className="mx-auto h-16 w-16 text-primary" />
          <h1 className="mt-4 font-display text-2xl font-bold">Booking Terkirim!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Permintaan booking Anda telah dikirim ke venue. Waiting for venue confirmation.
          </p>
          <p className="mt-2 text-sm font-medium">
            {course?.name} · {new Date(selectedDate).toLocaleDateString("id-ID", {
              weekday: "long", day: "numeric", month: "long", year: "numeric"
            })}
          </p>
          <p className="mt-1 text-lg font-bold text-primary">{selectedTime} · {players} players</p>
          {totalPrice > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">Estimated: {formatPrice(totalPrice)}</p>
          )}
          <div className="mt-6 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => navigate(`/venue/${courseId}`)}>
              Back to Course
            </Button>
            <Button className="flex-1" onClick={() => navigate("/venue")}>
              Browse Venues
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bottom-nav-safe">
      {/* Header */}
      <div className="relative">
        <img src={course?.image_url || venueImg} alt="Course" className="h-40 w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 rounded-full bg-background/60 p-2 backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="absolute bottom-3 left-4">
          <h1 className="font-display text-xl font-bold drop-shadow">{course?.name ?? "Book Tee Time"}</h1>
          {course?.location && (
            <p className="flex items-center gap-1 text-xs text-foreground/80">
              <MapPin className="h-3 w-3" /> {course.location}
            </p>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* Date picker */}
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Tanggal
          </Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(null); }}
            min={new Date().toISOString().split("T")[0]}
            className="mt-1.5 h-11 rounded-xl border-border/50 bg-card/80"
          />
        </div>

        {/* Time slots */}
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Select Tee-Off Time
          </Label>
          {displayPrice > 0 && (
            <p className="text-[11px] text-muted-foreground mt-1">
              {formatPrice(displayPrice)} · {isWeekend ? "Weekend" : "Weekday"}
            </p>
          )}
          <div className="mt-2 grid grid-cols-4 gap-2">
            {timeSlots.map((time) => {
              const isBooked = bookedTimes.has(time);
              const isSelected = selectedTime === time;
              return (
                <button
                  key={time}
                  onClick={() => !isBooked && setSelectedTime(time)}
                  disabled={isBooked}
                  className={`rounded-xl py-2.5 text-sm font-medium transition-all ${
                    isBooked
                      ? "bg-muted/50 text-muted-foreground/40 cursor-not-allowed line-through"
                      : isSelected
                        ? "bg-primary text-primary-foreground golf-glow"
                        : "golf-card hover:border-primary/30"
                  }`}
                >
                  {time}
                </button>
              );
            })}
          </div>
        </div>

        {/* Players count */}
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Number of Players
          </Label>
          <div className="mt-2 flex gap-2">
            {Array.from({ length: slotConfig?.max_players ?? 4 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPlayers(n)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all ${
                  players === n
                    ? "bg-primary text-primary-foreground golf-glow"
                    : "golf-card hover:border-primary/30"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Notes (optional)
          </Label>
          <Input
            placeholder="e.g. Need cart, bringing own clubs..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1.5 h-11 rounded-xl border-border/50 bg-card/80"
          />
        </div>

        {/* Price summary */}
        {displayPrice > 0 && (
          <div className="golf-card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">
                Green Fee × {players} · {isWeekend ? "Weekend" : "Weekday"}
              </p>
              <p className="text-sm font-semibold">{formatPrice(displayPrice)} × {players} player{players > 1 ? "s" : ""}</p>
            </div>
            <p className="text-2xl font-bold text-primary">{formatPrice(totalPrice)}</p>
          </div>
        )}

        {/* Book button */}
        <Button
          className="h-14 w-full rounded-xl text-base font-bold uppercase tracking-wider golf-glow"
          disabled={!selectedTime || booking}
          onClick={() => {
            if (!hasFeature("booking_tee_time")) { setShowUpgrade(true); return; }
            handleBook();
          }}
        >
          {booking ? "Booking..." : selectedTime
            ? `Book ${selectedTime} ${totalPrice > 0 ? `· ${formatPrice(totalPrice)}` : ""}`
            : "Select a time first"}
        </Button>
      </div>

      <UpgradeDialog
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        requiredTier="golfer"
        featureName="Booking Tee Time"
      />
    </div>
  );
};

export default BookTeeTime;
