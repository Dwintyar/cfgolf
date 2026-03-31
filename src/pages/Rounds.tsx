import GBLogo from "@/assets/logo-gb.svg";
import { useState } from "react";
import TourList from "./TourList";

const Rounds = () => {
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="shrink-0 bg-card border-b border-border/50">
        <div className="flex px-4 pt-3 pb-3 items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={GBLogo} alt="GB" className="h-8 w-8 object-contain" />
            <h1 className="text-xl font-bold text-foreground">Rounds</h1>
          </div>
        </div>
      </div>

      {/* Content — only Play */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto pb-20 lg:pb-0">
          <TourList embedded />
        </div>
      </div>
    </div>
  );
};

export default Rounds;
