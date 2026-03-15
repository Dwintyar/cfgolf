import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Mail, Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

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
      // Get all conversation IDs for this user
      const { data: parts } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId!);

      if (!parts || parts.length === 0) return [];

      const convIds = parts.map((p) => p.conversation_id);

      // Get other participants with profile info
      const { data: otherParts } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id, profiles(full_name, avatar_url)")
        .in("conversation_id", convIds)
        .neq("user_id", userId!);

      // Get last message for each conversation
      const convos = await Promise.all(
        convIds.map(async (convId) => {
          const { data: lastMsg } = await supabase
            .from("chat_messages")
            .select("content, created_at")
            .eq("conversation_id", convId)
            .order("created_at", { ascending: false })
            .limit(1);

          const other = otherParts?.find((p) => p.conversation_id === convId);
          return {
            id: convId,
            otherUser: other?.profiles as any,
            lastMessage: lastMsg?.[0]?.content ?? "No messages yet",
            lastTime: lastMsg?.[0]?.created_at,
          };
        })
      );

      return convos.sort((a, b) =>
        (b.lastTime ?? "").localeCompare(a.lastTime ?? "")
      );
    },
    enabled: !!userId,
  });

  // Start a new conversation with a random golfer (for demo)
  const startNewChat = async () => {
    if (!userId) return;

    // Find a random profile to chat with
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

    // Check if conversation already exists
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

    // Create new conversation
    const newConvId = uuidv4();
    const { error: convError } = await supabase
      .from("conversations")
      .insert({ id: newConvId });

    if (convError) {
      toast.error("Failed to create chat");
      return;
    }

    await supabase.from("conversation_participants").insert([
      { conversation_id: newConvId, user_id: userId },
      { conversation_id: newConvId, user_id: randomProfile.id },
    ]);

    toast.success(`Chat started with ${randomProfile.full_name}`);
    navigate(`/chat/${newConvId}`);
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
            <Avatar className="h-12 w-12 border-2 border-primary/30">
              <AvatarImage src={conv.otherUser?.avatar_url ?? ""} />
              <AvatarFallback className="bg-secondary text-sm font-bold">
                {getInitials(conv.otherUser?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">
                {conv.otherUser?.full_name ?? "Unknown"}
              </p>
              <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
            </div>
            {conv.lastTime && (
              <span className="text-[10px] text-muted-foreground">
                {new Date(conv.lastTime).toLocaleDateString([], { month: "short", day: "numeric" })}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChatList;
