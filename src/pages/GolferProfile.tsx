import { ArrowLeft, MapPin, Camera, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import heroImg from "@/assets/golf-hero.jpg";
import venueImg from "@/assets/golf-venue.jpg";
import { useState } from "react";

type Tab = "about" | "clubs" | "gallery";

const GolferProfile = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("clubs");

  const tabs: { id: Tab; label: string }[] = [
    { id: "about", label: "About" },
    { id: "clubs", label: "Clubs" },
    { id: "gallery", label: "Gallery" },
  ];

  return (
    <div className="bottom-nav-safe">
      {/* Gradient header background */}
      <div className="relative bg-gradient-to-b from-secondary to-background pb-6">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 z-10 rounded-full bg-background/40 p-2 backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Centered avatar like reference GD_Mob_71 */}
        <div className="flex flex-col items-center pt-12">
          <Avatar className="h-24 w-24 border-4 border-primary/40">
            <AvatarFallback className="bg-primary text-3xl font-bold text-primary-foreground">
              SW
            </AvatarFallback>
          </Avatar>
          <h1 className="mt-3 font-display text-xl font-bold">Susie Wright</h1>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            London, England
          </p>

          {/* Stats badges like reference */}
          <div className="mt-3 flex gap-3">
            <Badge variant="outline" className="rounded-lg border-border px-4 py-1.5 text-sm font-bold">
              HCP 18
            </Badge>
            <Badge variant="outline" className="rounded-lg border-border px-4 py-1.5 text-sm font-bold">
              5 Clubs
            </Badge>
          </div>

          {/* Action buttons like reference GD_Mob_72 */}
          <div className="mt-4 flex gap-3 px-8 w-full">
            <Button variant="outline" className="flex-1 h-10 rounded-xl text-sm font-bold uppercase tracking-wider border-border">
              Message
            </Button>
            <Button className="flex-1 h-10 rounded-xl text-sm font-bold uppercase tracking-wider">
              Follow
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs like reference */}
      <div className="flex items-center justify-center gap-6 border-b border-border/50 px-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative py-3 text-sm font-semibold transition-colors ${
              tab === t.id ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {t.label}
            {tab === t.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
        {/* Plus button between tabs like reference */}
        <button className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
          +
        </button>
      </div>

      {/* Tab content */}
      <div className="px-4 pt-4">
        {tab === "about" && (
          <div className="space-y-3 animate-fade-in">
            <div className="golf-card p-4">
              <p className="text-sm text-muted-foreground">
                Passionate golfer based in London. Love exploring new courses and meeting fellow golfers.
                Started playing at age 12 and never looked back!
              </p>
            </div>
            <div className="golf-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Location</p>
              <p className="text-sm flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" /> London, England
              </p>
            </div>
          </div>
        )}

        {tab === "clubs" && (
          <div className="grid grid-cols-2 gap-3 animate-fade-in">
            {["Spartan Golf Club", "Hollywood Golf Club", "Pine Valley GC", "Augusta National"].map((c, i) => (
              <div key={c} className="golf-card overflow-hidden animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="h-24 bg-secondary flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary/30">{c.charAt(0)}</span>
                </div>
                <p className="p-2 text-xs font-medium truncate">{c}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "gallery" && (
          <div className="grid grid-cols-3 gap-1.5 animate-fade-in">
            {[heroImg, venueImg, heroImg, venueImg, heroImg, venueImg, heroImg, venueImg, heroImg].map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`Gallery ${i + 1}`}
                className="aspect-square w-full rounded-sm object-cover animate-fade-in"
                style={{ animationDelay: `${i * 30}ms` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GolferProfile;
