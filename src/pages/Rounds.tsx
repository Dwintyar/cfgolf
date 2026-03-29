import { useState } from "react";
import TourList from "./TourList";
import VenueList from "./VenueList";

const Rounds = () => {
  const [tab, setTab] = useState<"play" | "courses">("play");

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header with tabs */}
      <div className="shrink-0 bg-card border-b border-border/50">
        <div className="flex px-4 pt-3 pb-0 items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Rounds</h1>
        </div>
        <div className="flex mt-2">
          <button
            onClick={() => setTab("play")}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
              tab === "play"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            🚩 Play
          </button>
          <button
            onClick={() => setTab("courses")}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
              tab === "courses"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            📍 Courses
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className={tab === "play" ? "h-full overflow-auto pb-20 lg:pb-0" : "hidden"}>
          <TourList embedded />
        </div>
        <div className={tab === "courses" ? "h-full overflow-auto pb-20 lg:pb-0" : "hidden"}>
          <VenueList embedded />
        </div>
      </div>
    </div>
  );
};

export default Rounds;
