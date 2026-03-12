import { ArrowLeft, MapPin, Award, Camera, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/golf-hero.jpg";
import venueImg from "@/assets/golf-venue.jpg";

const GolferProfile = () => {
  const navigate = useNavigate();

  return (
    <div className="bottom-nav-safe">
      <div className="relative">
        <img src={heroImg} alt="Cover" className="h-36 w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 rounded-full bg-background/60 p-2 backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4 -mt-12 relative z-10">
        <div className="flex items-end gap-4">
          <Avatar className="h-20 w-20 border-4 border-background">
            <AvatarFallback className="bg-primary text-2xl font-bold text-primary-foreground">
              JW
            </AvatarFallback>
          </Avatar>
          <div className="pb-1">
            <h1 className="font-display text-xl font-bold">James Walker</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Pine Valley, NJ
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            { label: "HCP", value: "10.2" },
            { label: "Rounds", value: "124" },
            { label: "Best", value: "68" },
            { label: "Clubs", value: "3" },
          ].map((s) => (
            <div key={s.label} className="golf-card p-3 text-center">
              <p className="text-lg font-bold text-primary">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <Button className="flex-1 h-10 rounded-xl text-sm">Follow</Button>
          <Button variant="secondary" className="flex-1 h-10 rounded-xl text-sm">
            Message
          </Button>
        </div>

        <h2 className="mt-6 mb-3 font-display text-lg font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> Clubs
        </h2>
        <div className="space-y-2">
          {["Pine Valley Golf Club", "Weekend Warriors GC", "Iron Sharpeners"].map((c, i) => (
            <div key={c} className="golf-card flex items-center gap-3 p-3 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
              <Award className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium">{c}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-6 mb-3 font-display text-lg font-semibold flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" /> Gallery
        </h2>
        <div className="grid grid-cols-3 gap-1.5 rounded-xl overflow-hidden">
          {[heroImg, venueImg, heroImg, venueImg, heroImg, venueImg].map((img, i) => (
            <img
              key={i}
              src={img}
              alt={`Gallery ${i + 1}`}
              className="aspect-square w-full object-cover"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default GolferProfile;
