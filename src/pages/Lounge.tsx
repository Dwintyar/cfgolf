import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import DesktopLayout from "@/components/DesktopLayout";
import NewsFeed from "./NewsFeed";
import ChatList from "./ChatList";
import { ChatNotifContext } from "@/App";

const Lounge = () => {
  const [tab, setTab] = useState<"channels" | "chats">("channels");
  const { unreadCount } = useContext(ChatNotifContext);
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* WA-style header with tabs */}
      <div className="shrink-0 bg-card border-b border-border/50">
        <div className="flex px-4 pt-3 pb-0 items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Lounge</h1>
        </div>
        <div className="flex mt-2">
          <button
            onClick={() => setTab("channels")}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
              tab === "channels"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Channels
          </button>
          <button
            onClick={() => setTab("chats")}
            className={`relative flex-1 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
              tab === "chats"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Chats
            {unreadCount > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content — render both but hide inactive */}
      <div className="flex-1 overflow-hidden">
        <div className={tab === "channels" ? "h-full overflow-auto" : "hidden"}>
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
