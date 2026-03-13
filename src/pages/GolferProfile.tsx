import { ArrowLeft, Globe, Mail } from "lucide-react";
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
  const [tab, setTab] = useState<Tab>("about");

  const tabs: { id: Tab; label: string }[] = [
    { id: "about", label: "ABOUT" },
    { id: "clubs", label: "CLUBS" },
    { id: "gallery", label: "GALLERY" },
  ];

  return (
    <div className="bottom-nav-safe">
      {/* Green gradient header */}
      <div className="relative bg-gradient-to-b from-secondary to-background pb-6">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 z-10 rounded-full bg-background/40 p-2 backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Centered avatar */}
        <div className="flex flex-col items-center pt-14">
          <Avatar className="h-28 w-28 border-4 border-primary/50">
            <AvatarFallback className="bg-primary text-3xl font-bold text-primary-foreground">
              SW
            </AvatarFallback>
          </Avatar>
          <h1 className="mt-3 font-display text-xl font-bold">Susie Wright</h1>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Jakarta, Indonesia
          </p>

          {/* Stats badges */}
          <div className="mt-4 flex gap-3 px-8 w-full">
            <Badge variant="outline" className="flex-1 justify-center rounded-lg border-border px-4 py-2.5 text-sm font-bold">
              HCP 18
            </Badge>
            <Badge variant="outline" className="flex-1 justify-center rounded-lg border-border px-4 py-2.5 text-sm font-bold">
              5 CLUBS
            </Badge>
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex gap-3 px-8 w-full">
            <Button variant="outline" className="flex-1 h-11 rounded-xl text-sm font-bold uppercase tracking-wider border-border">
              Message
            </Button>
            <Button className="flex-1 h-11 rounded-xl text-sm font-bold uppercase tracking-wider">
              Follow
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-center gap-8 border-b border-border/50 px-4">
        {tabs.map((t, i) => (
          <div key={t.id} className="flex items-center gap-4">
            <button
              onClick={() => setTab(t.id)}
              className={`relative py-3 text-sm font-semibold tracking-wider transition-colors ${
                tab === t.id ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {t.label}
              {tab === t.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
            {/* Plus button after CLUBS tab */}
            {t.id === "clubs" && (
              <button className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                +
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-4 pt-4 pb-4">
        {tab === "about" && (
          <div className="space-y-4 animate-fade-in">
            {/* Bio */}
            <div className="px-2">
              <p className="text-sm italic text-muted-foreground">
                Easy Come ... Easy Go ...
              </p>
            </div>

            {/* Website & Social */}
            <div className="golf-card p-4 flex items-start gap-4">
              <Globe className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm">www.susiesaysblog.com</p>
                <p className="text-sm text-muted-foreground">SusieSays - Instagram</p>
              </div>
            </div>

            {/* Email */}
            <div className="golf-card p-4 flex items-center gap-4">
              <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
              <p className="text-sm">susiewright@susiesaysblog.com</p>
            </div>
          </div>
        )}

        {tab === "clubs" && (
          <div className="grid grid-cols-2 gap-3 animate-fade-in">
            {[
              { name: "Spartan Golf Club", abbr: "S" },
              { name: "Hollywood Golf Club", abbr: "H" },
              { name: "Pine Valley GC", abbr: "P" },
              { name: "Augusta National", abbr: "A" },
            ].map((c, i) => (
              <div key={c.name} className="golf-card overflow-hidden animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="h-28 bg-secondary flex items-center justify-center">
                  <span className="text-3xl font-bold text-primary/30">{c.abbr}</span>
                </div>
                <p className="p-2.5 text-xs font-medium truncate">{c.name}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "gallery" && (
          <div className="grid grid-cols-4 gap-1 animate-fade-in">
            {[heroImg, venueImg, heroImg, venueImg, heroImg, venueImg, heroImg, venueImg, heroImg, venueImg, heroImg, venueImg].map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`Gallery ${i + 1}`}
                className="aspect-square w-full object-cover animate-fade-in"
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
