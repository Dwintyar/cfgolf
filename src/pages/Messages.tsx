import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const chats = [
  { name: "Alex Turner", initials: "AT", last: "See you at the tee!", time: "2m", unread: 2 },
  { name: "Pine Valley Club", initials: "PV", last: "Tournament starts Saturday", time: "1h", unread: 0 },
  { name: "Lisa Park", initials: "LP", last: "Great round today!", time: "3h", unread: 1 },
  { name: "David Kim", initials: "DK", last: "Want to play Thursday?", time: "1d", unread: 0 },
  { name: "Spring Open Group", initials: "SO", last: "Pairings are out", time: "2d", unread: 5 },
];

const Messages = () => {
  return (
    <div className="bottom-nav-safe">
      <div className="p-4">
        <h1 className="font-display text-2xl font-bold mb-4">Messages</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            className="h-10 rounded-xl border-border/50 bg-card/80 pl-10"
          />
        </div>
      </div>

      <div className="divide-y divide-border/30">
        {chats.map((chat, i) => (
          <button
            key={chat.name}
            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary/30 transition-colors animate-fade-in"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarFallback className="bg-secondary text-sm font-bold">
                {chat.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold truncate">{chat.name}</p>
                <span className="text-xs text-muted-foreground">{chat.time}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{chat.last}</p>
            </div>
            {chat.unread > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {chat.unread}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Messages;
