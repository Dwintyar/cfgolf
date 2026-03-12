import { Mail } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const chats = [
  { name: "Nora Bravo", initials: "NB", bio: "Product Designer at LoudSound.", online: true },
  { name: "Lacey-Mae Howe", initials: "LH", bio: "I love to ride a bike every now and then. Enjoy coffee, whisky and red wine.", online: true },
  { name: "Derrick Solis", initials: "DS", bio: "Director of Software and Engineering at WorkHard Inc.", online: false },
  { name: "Amy Ford", initials: "AF", bio: "I'm a happy person with mediocre dance moves. Originally from San Diego.", online: true },
  { name: "Susie Wright", initials: "SW", bio: "Fashion Blogger at WhatIf.", online: false },
  { name: "Blane Clements", initials: "BC", bio: "Wannabe surfer. Sometimes I read books and watch movies at the same time.", online: true },
  { name: "James Harrington", initials: "JH", bio: "Director of Software and Engineering at WorkHard Inc.", online: false },
];

const Messages = () => {
  return (
    <div className="bottom-nav-safe">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <h1 className="font-display text-2xl font-bold">Messages</h1>
        <button className="relative rounded-full bg-secondary p-2">
          <Mail className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">3</span>
        </button>
      </div>

      <div className="divide-y divide-border/30">
        {chats.map((chat, i) => (
          <button
            key={chat.name}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/30 transition-colors animate-fade-in"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <Avatar className="h-12 w-12 border-2 border-primary/30">
              <AvatarFallback className="bg-secondary text-sm font-bold">
                {chat.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">{chat.name}</p>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{chat.bio}</p>
            </div>
            {/* Online status dot like reference */}
            <div className={`h-4 w-4 rounded-full ${chat.online ? "bg-primary" : "bg-muted"}`} />
          </button>
        ))}
      </div>
    </div>
  );
};

export default Messages;
