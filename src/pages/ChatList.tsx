import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Mail, Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

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

  const startNewChat = async () => {
    if (!userId) return;

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .neq("id", userId)
      .limit(20);

    if (!profiles || profiles.length === 0) {
      toast.error("No other users found");
      return;
    }

    const randomProfile = profiles[Math.floor(Math.random() * profiles.length)];

    const { data: existingParts } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId);

    if (existingParts) {
      for (const ep of existingParts) {
        const { data: otherPart } = await supabase
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", ep.conversation_id)
          .eq("user_id", randomProfile.id);
        if (otherPart && otherPart.length > 0) {
          navigate(`/chat/${ep.conversation_id}`);
          return;
        }
      }
    }

    const newId = crypto.randomUUID();
    const { error: convError } = await supabase
      .from("conversations")
      .insert({ id: newId });

    if (convError) {
      toast.error("Failed to create chat");
      return;
    }

    await supabase.from("conversation_participants").insert([
      { conversation_id: newId, user_id: userId },
      { conversation_id: newId, user_id: randomProfile.id },
    ]);

    toast.success(`Chat started with ${randomProfile.full_name}`);
    navigate(`/chat/${newId}`);
  };

  const getInitials = (name: string | null) =>
    name ? name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() : "?";

  return (
    <div className="bottom-nav-safe">
      <div className="flex items-center justify-between p-4">
        <h1 className="font-display text-2xl font-bold">Messages</h1>
        <div className="flex gap-2">
          <button
            onClick={startNewChat}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button className="relative rounded-full bg-secondary p-2">
            <Mail className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="divide-y divide-border/30">
        {isLoading && (
          <p className="text-center text-sm text-muted-foreground py-8">Loading chats...</p>
        )}

        {!isLoading && (!conversations || conversations.length === 0) && (
          <div className="p-8 text-center">
            <Mail className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">Belum ada percakapan</p>
            <button
              onClick={startNewChat}
              className="mt-3 text-sm font-semibold text-primary"
            >
              Mulai chat baru
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
    </div>
  );
};

export default ChatList;
