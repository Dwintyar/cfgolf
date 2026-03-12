import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Star, Users, CheckCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import venueImg from "@/assets/golf-venue.jpg";
import { toast } from "sonner";

const TIME_SLOTS = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30",
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30",
];

const BookTeeTime = () => {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const [userId, setUserId] = useState<string | null>(null);
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
    existingBookings?.filter((b) => b.players_count >= 4).map((b) => b.tee_time.slice(0, 5)) ?? []
  );

  const price = course?.green_fee_price ? Number(course.green_fee_price) : 0;
  const totalPrice = price * players;

  const handleBook = async () => {
    if (!userId || !courseId || !selectedTime) return;
    setBooking(true);

    const { error } = await supabase.from("tee_time_bookings").insert({
      course_id: courseId,
      user_id: userId,
      booking_date: selectedDate,
      tee_time: selectedTime,
      players_count: players,
      total_price: totalPrice,
      notes: notes || null,
    });

    setBooking(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setConfirmed(true);
    toast.success("Booking berhasil!");
  };

  if (confirmed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <div className="animate-fade-in">
          <CheckCircle className="mx-auto h-16 w-16 text-primary" />
          <h1 className="mt-4 font-display text-2xl font-bold">Booking Confirmed!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {course?.name} · {new Date(selectedDate).toLocaleDateString("id-ID", {
              weekday: "long", day: "numeric", month: "long", year: "numeric"
            })}
          </p>
          <p className="mt-1 text-lg font-bold text-primary">{selectedTime} · {players} player{players > 1 ? "s" : ""}</p>
          {totalPrice > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">Total: ${totalPrice.toFixed(2)}</p>
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
            Pilih Waktu Tee-Off
          </Label>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {TIME_SLOTS.map((time) => {
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
            <Users className="h-3.5 w-3.5" /> Jumlah Pemain
          </Label>
          <div className="mt-2 flex gap-2">
            {[1, 2, 3, 4].map((n) => (
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
            Catatan (opsional)
          </Label>
          <Input
            placeholder="Contoh: Need cart, bringing own clubs..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1.5 h-11 rounded-xl border-border/50 bg-card/80"
          />
        </div>

        {/* Price summary */}
        {price > 0 && (
          <div className="golf-card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Green Fee × {players}</p>
              <p className="text-sm font-semibold">${price.toFixed(0)} × {players} player{players > 1 ? "s" : ""}</p>
            </div>
            <p className="text-2xl font-bold text-primary">${totalPrice.toFixed(2)}</p>
          </div>
        )}

        {/* Book button */}
        <Button
          className="h-14 w-full rounded-xl text-base font-bold uppercase tracking-wider golf-glow"
          disabled={!selectedTime || booking}
          onClick={handleBook}
        >
          {booking ? "Booking..." : selectedTime
            ? `Book ${selectedTime} ${totalPrice > 0 ? `· $${totalPrice.toFixed(2)}` : ""}`
            : "Pilih waktu terlebih dahulu"}
        </Button>
      </div>
    </div>
  );
};

export default BookTeeTime;
