import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Mail, PenSquare, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import NewMessageDialog from "@/components/NewMessageDialog";

const formatRelativeTime = (dateStr: string) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString("en-US", { weekday: "short" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const getInitials = (name: string | null) =>
  name ? name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() : "?";

const ChatList = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [newMsgOpen, setNewMsgOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chats" | "contacts">("chats");
  const [startingChat, setStartingChat] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/login", { replace: true });
      else setUserId(session.user.id);
    });
  }, [navigate]);

  const { data: conversations, isLoading: loadingChats } = useQuery({
    queryKey: ["my-conversations", userId],
    queryFn: async () => {
      const { data: parts } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId!);

      if (!parts || parts.length === 0) return [];

      const convIds = parts.map((p) => p.conversation_id);

      const { data: otherParts } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id, profiles(full_name, avatar_url)")
        .in("conversation_id", convIds)
        .neq("user_id", userId!);

      const convos = await Promise.all(
        convIds.map(async (convId) => {
          const { data: lastMsg } = await supabase
            .from("chat_messages")
            .select("content, created_at, sender_id")
            .eq("conversation_id", convId)
            .order("created_at", { ascending: false })
            .limit(1);

          const other = otherParts?.find((p) => p.conversation_id === convId);
          const hasLastMsg = lastMsg && lastMsg.length > 0;
          const isUnread = hasLastMsg && lastMsg[0].sender_id !== userId;

          return {
            id: convId,
            otherUser: other?.profiles as any,
            lastMessage: hasLastMsg ? lastMsg[0].content : null,
            lastTime: hasLastMsg ? lastMsg[0].created_at : null,
            isUnread,
          };
        })
      );

      return convos.sort((a, b) =>
        (b.lastTime ?? "").localeCompare(a.lastTime ?? "")
      );
    },
    enabled: !!userId,
  });

  const { data: contacts, isLoading: loadingContacts } = useQuery({
    queryKey: ["buddy-contacts", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("buddy_connections")
        .select("requester_id, addressee_id, profiles!buddy_connections_requester_id_fkey(id, full_name, avatar_url, handicap), profiles!buddy_connections_addressee_id_fkey(id, full_name, avatar_url, handicap)")
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

      return (data ?? []).map((row: any) => {
        const isMeRequester = row.requester_id === userId;
        const buddy = isMeRequester
          ? row["profiles!buddy_connections_addressee_id_fkey"]
          : row["profiles!buddy_connections_requester_id_fkey"];
        return buddy;
      }).filter(Boolean);
    },
    enabled: !!userId && activeTab === "contacts",
  });

  const openChatWithContact = async (targetId: string, targetName: string) => {
    if (!userId) return;
    setStartingChat(targetId);

    const { data: myParts } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId);

    if (myParts) {
      for (const ep of myParts) {
        const { data: otherPart } = await supabase
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", ep.conversation_id)
          .eq("user_id", targetId)
          .limit(1);
        if (otherPart && otherPart.length > 0) {
          setStartingChat(null);
          navigate(`/chat/${ep.conversation_id}`);
          return;
        }
      }
    }

    const newId = crypto.randomUUID();
    await supabase.from("conversations").insert({ id: newId });
    await supabase.from("conversation_participants").insert([
      { conversation_id: newId, user_id: userId },
      { conversation_id: newId, user_id: targetId },
    ]);

    setStartingChat(null);
    navigate(`/chat/${newId}`);
  };

  return (
    <div className="bottom-nav-safe">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <h1 className="font-display text-2xl font-bold">Messages</h1>
        <button
          onClick={() => setNewMsgOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          aria-label="New message"
        >
          <PenSquare className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/50 px-4 gap-6">
        {(["chats", "contacts"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2.5 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "chats" ? "Chats" : "Contacts"}
          </button>
        ))}
      </div>

      {/* Chats tab */}
      {activeTab === "chats" && (
        <div className="divide-y divide-border/30">
          {loadingChats && (
            <p className="text-center text-sm text-muted-foreground py-8">Loading chats...</p>
          )}
          {!loadingChats && (!conversations || conversations.length === 0) && (
            <div className="p-8 text-center">
              <Mail className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">No conversations yet</p>
              <button
                onClick={() => setNewMsgOpen(true)}
                className="mt-3 text-sm font-semibold text-primary"
              >
                Start a new chat
              </button>
            </div>
          )}
          {conversations?.map((conv, i) => (
            <button
              key={conv.id}
              onClick={() => navigate(`/chat/${conv.id}`)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/30 transition-colors animate-fade-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="relative">
                <Avatar className="h-12 w-12 border-2 border-primary/30">
                  <AvatarImage src={conv.otherUser?.avatar_url ?? ""} />
                  <AvatarFallback className="bg-secondary text-sm font-bold">
                    {getInitials(conv.otherUser?.full_name)}
                  </AvatarFallback>
                </Avatar>
                {conv.isUnread && (
                  <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm truncate ${conv.isUnread ? "font-bold text-foreground" : "font-semibold text-foreground"}`}>
                    {conv.otherUser?.full_name ?? "Unknown"}
                  </p>
                  {conv.lastTime && (
                    <span className={`text-[10px] shrink-0 ${conv.isUnread ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                      {formatRelativeTime(conv.lastTime)}
                    </span>
                  )}
                </div>
                <p className={`text-xs truncate ${conv.lastMessage ? (conv.isUnread ? "text-foreground font-medium" : "text-muted-foreground") : "text-muted-foreground/60 italic"}`}>
                  {conv.lastMessage ?? "No messages yet"}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Contacts tab */}
      {activeTab === "contacts" && (
        <div className="divide-y divide-border/30">
          {loadingContacts && (
            <p className="text-center text-sm text-muted-foreground py-8">Loading contacts...</p>
          )}
          {!loadingContacts && (!contacts || contacts.length === 0) && (
            <div className="p-8 text-center">
              <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">No buddies yet</p>
              <button
                onClick={() => navigate("/play")}
                className="mt-3 text-sm font-semibold text-primary"
              >
                Find buddies
              </button>
            </div>
          )}
          {contacts?.map((contact: any, i: number) => (
            <button
              key={contact.id}
              onClick={() => openChatWithContact(contact.id, contact.full_name)}
              disabled={startingChat === contact.id}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/30 transition-colors animate-fade-in disabled:opacity-60"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <Avatar className="h-12 w-12 border-2 border-primary/30">
                <AvatarImage src={contact.avatar_url ?? ""} />
                <AvatarFallback className="bg-secondary text-sm font-bold">
                  {getInitials(contact.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{contact.full_name}</p>
                {contact.handicap != null && (
                  <p className="text-xs text-muted-foreground">HCP {contact.handicap}</p>
                )}
              </div>
              <span className="text-xs text-primary font-semibold">
                {startingChat === contact.id ? "Opening..." : "Message"}
              </span>
            </button>
          ))}
        </div>
      )}

      {userId && (
        <NewMessageDialog
          open={newMsgOpen}
          onOpenChange={setNewMsgOpen}
          userId={userId}
        />
      )}
    </div>
  );
};

export default ChatList;


const formatRelativeTime = (dateStr: string) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString("en-US", { weekday: "short" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const ChatList = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [newMsgOpen, setNewMsgOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/login", { replace: true });
      else setUserId(session.user.id);
    });
  }, [navigate]);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["my-conversations", userId],
    queryFn: async () => {
      const { data: parts } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId!);

      if (!parts || parts.length === 0) return [];

      const convIds = parts.map((p) => p.conversation_id);

      const { data: otherParts } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id, profiles(full_name, avatar_url)")
        .in("conversation_id", convIds)
        .neq("user_id", userId!);

      const convos = await Promise.all(
        convIds.map(async (convId) => {
          const { data: lastMsg } = await supabase
            .from("chat_messages")
            .select("content, created_at, sender_id")
            .eq("conversation_id", convId)
            .order("created_at", { ascending: false })
            .limit(1);

          const other = otherParts?.find((p) => p.conversation_id === convId);
          const hasLastMsg = lastMsg && lastMsg.length > 0;
          const isUnread = hasLastMsg && lastMsg[0].sender_id !== userId;

          return {
            id: convId,
            otherUser: other?.profiles as any,
            lastMessage: hasLastMsg ? lastMsg[0].content : null,
            lastTime: hasLastMsg ? lastMsg[0].created_at : null,
            isUnread,
          };
        })
      );

      return convos.sort((a, b) =>
        (b.lastTime ?? "").localeCompare(a.lastTime ?? "")
      );
    },
    enabled: !!userId,
  });

  const getInitials = (name: string | null) =>
    name ? name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() : "?";

  return (
    <div className="bottom-nav-safe">
      <div className="flex items-center justify-between p-4">
        <h1 className="font-display text-2xl font-bold">Messages</h1>
        <button
          onClick={() => setNewMsgOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          aria-label="New message"
        >
          <PenSquare className="h-4 w-4" />
        </button>
      </div>

      <div className="divide-y divide-border/30">
        {isLoading && (
          <p className="text-center text-sm text-muted-foreground py-8">Loading chats...</p>
        )}

        {!isLoading && (!conversations || conversations.length === 0) && (
          <div className="p-8 text-center">
            <Mail className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">No conversations yet</p>
            <button
              onClick={() => setNewMsgOpen(true)}
              className="mt-3 text-sm font-semibold text-primary"
            >
              Start a new chat
            </button>
          </div>
        )}

        {conversations?.map((conv, i) => (
          <button
            key={conv.id}
            onClick={() => navigate(`/chat/${conv.id}`)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/30 transition-colors animate-fade-in"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="relative">
              <Avatar className="h-12 w-12 border-2 border-primary/30">
                <AvatarImage src={conv.otherUser?.avatar_url ?? ""} />
                <AvatarFallback className="bg-secondary text-sm font-bold">
                  {getInitials(conv.otherUser?.full_name)}
                </AvatarFallback>
              </Avatar>
              {conv.isUnread && (
                <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-primary border-2 border-background" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm truncate ${conv.isUnread ? "font-bold text-foreground" : "font-semibold text-foreground"}`}>
                  {conv.otherUser?.full_name ?? "Unknown"}
                </p>
                {conv.lastTime && (
                  <span className={`text-[10px] shrink-0 ${conv.isUnread ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                    {formatRelativeTime(conv.lastTime)}
                  </span>
                )}
              </div>
              <p className={`text-xs truncate ${conv.lastMessage ? (conv.isUnread ? "text-foreground font-medium" : "text-muted-foreground") : "text-muted-foreground/60 italic"}`}>
                {conv.lastMessage ?? "No messages yet"}
              </p>
            </div>
          </button>
        ))}
      </div>

      {userId && (
        <NewMessageDialog
          open={newMsgOpen}
          onOpenChange={setNewMsgOpen}
          userId={userId}
        />
      )}
    </div>
  );
};

export default ChatList;
