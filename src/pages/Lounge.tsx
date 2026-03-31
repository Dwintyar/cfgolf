import { useState, useContext } from "react";
import { ChatNotifContext } from "@/App";
import ChannelsTab from "@/components/lounge/ChannelsTab";
import ChatList from "./ChatList";
import GBLogo from "@/assets/logo-gb.svg";
import GBLogoDark from "@/assets/logo-gb-dark.svg";

const Lounge = () => {
  const [tab, setTab] = useState<"channels" | "chats">("channels");
  const { unreadCount } = useContext(ChatNotifContext);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* WA-style header */}
      <div className="shrink-0 bg-card border-b border-border/50">
        <div className="px-4 pt-3 pb-0">
          <div className="flex items-center gap-2">
            <img src={document.documentElement.classList.contains("light") ? GBLogo : GBLogoDark} alt="GB" className="h-8 w-8 object-contain" />
            <h1 className="text-xl font-bold text-foreground">Lounge</h1>
          </div>
        </div>
        <div className="flex mt-1">
          {[
            { id: "channels", label: "Channels" },
            { id: "chats", label: "Chats", badge: unreadCount },
          ].map(({ id, label, badge }) => (
            <button
              key={id}
              onClick={() => setTab(id as any)}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
                tab === id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              {badge != null && badge > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className={tab === "channels" ? "h-full overflow-auto pb-20 lg:pb-0" : "hidden"}>
          <ChannelsTab />
        </div>
        <div className={tab === "chats" ? "h-full overflow-auto pb-20 lg:pb-0" : "hidden"}>
          <ChatList embedded />
        </div>
      </div>
    </div>
  );
};

export default Lounge;
