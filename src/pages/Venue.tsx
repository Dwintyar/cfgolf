import { ArrowLeft, MapPin, Clock, DollarSign, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import venueImg from "@/assets/golf-venue.jpg";

const teeSlots = [
  { time: "7:00 AM", available: true, price: "$45" },
  { time: "8:30 AM", available: true, price: "$55" },
  { time: "10:00 AM", available: false, price: "$65" },
  { time: "11:30 AM", available: true, price: "$65" },
  { time: "1:00 PM", available: true, price: "$55" },
  { time: "2:30 PM", available: true, price: "$45" },
];

const Venue = () => {
  const navigate = useNavigate();

  return (
    <div className="bottom-nav-safe">
      <div className="relative">
        <img src={venueImg} alt="Venue" className="h-56 w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 rounded-full bg-background/60 p-2 backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4 -mt-6 relative z-10">
        <h1 className="font-display text-2xl font-bold">Sunset Ridge Golf Club</h1>
        <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> Scottsdale, AZ
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-accent" /> 4.8
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: "18 Holes", icon: "⛳" },
            { label: "Par 72", icon: "🏌️" },
            { label: "6,800 yd", icon: "📏" },
          ].map((s) => (
            <div key={s.label} className="golf-card p-3 text-center">
              <p className="text-lg">{s.icon}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-6 mb-3 font-display text-lg font-semibold">Tee Times</h2>
        <div className="grid grid-cols-2 gap-2">
          {teeSlots.map((slot, i) => (
            <button
              key={slot.time}
              disabled={!slot.available}
              className={`golf-card flex items-center justify-between p-3 transition-colors animate-fade-in ${
                slot.available
                  ? "hover:border-primary/40"
                  : "opacity-40 cursor-not-allowed"
              }`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="text-left">
                <p className="text-sm font-semibold flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary" /> {slot.time}
                </p>
              </div>
              <span className="flex items-center text-sm font-bold text-primary">
                <DollarSign className="h-3 w-3" />
                {slot.price.replace("$", "")}
              </span>
            </button>
          ))}
        </div>

        <Button className="mt-6 h-12 w-full rounded-xl text-base font-semibold golf-glow">
          Book Tee Time
        </Button>
      </div>
    </div>
  );
};

export default Venue;
