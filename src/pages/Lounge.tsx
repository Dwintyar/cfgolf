import { useState, useContext } from "react";
import { ChatNotifContext } from "@/App";
import ChannelsTab from "@/components/lounge/ChannelsTab";
import NewsFeed from "./NewsFeed";
import ChatList from "./ChatList";

const Lounge = () => {
  const [tab, setTab] = useState<"channels" | "feed" | "chats">("channels");
  const { unreadCount } = useContext(ChatNotifContext);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* WA-style header */}
      <div className="shrink-0 bg-card border-b border-border/50">
        <div className="px-4 pt-3 pb-0">
          <h1 className="text-xl font-bold text-foreground">Lounge</h1>
        </div>
        <div className="flex mt-1">
          {[
            { id: "channels", label: "Channels" },
            { id: "feed", label: "Feed" },
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
        <div className={tab === "channels" ? "h-full" : "hidden"}>
          <ChannelsTab />
        </div>
        <div className={tab === "feed" ? "h-full overflow-auto" : "hidden"}>
          <NewsFeed embedded />
        </div>
        <div className={tab === "chats" ? "h-full overflow-auto" : "hidden"}>
          <ChatList embedded />
        </div>
      </div>
    </div>
  );
};

export default Lounge;
