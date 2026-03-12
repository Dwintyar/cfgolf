import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ChatRoom = () => {
  const navigate = useNavigate();
  const { id: conversationId } = useParams<{ id: string }>();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/login", { replace: true });
      else setUserId(session.user.id);
    });
  }, [navigate]);

  // Load other participant
  const { data: otherUser } = useQuery({
    queryKey: ["chat-participant", conversationId, userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversation_participants")
        .select("user_id, profiles(full_name, avatar_url)")
        .eq("conversation_id", conversationId!)
        .neq("user_id", userId!);
      return (data?.[0]?.profiles as any) ?? null;
    },
    enabled: !!conversationId && !!userId,
  });

  // Load initial messages
  useEffect(() => {
    if (!conversationId) return;
    const load = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*, profiles:sender_id(full_name, avatar_url)")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (data) setMessages(data);
    };
    load();
  }, [conversationId]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", payload.new.sender_id)
            .single();
          setMessages((prev) => [...prev, { ...payload.new, profiles: data }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !userId || !conversationId) return;
    const text = message.trim();
    setMessage("");
    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: text,
    });
  };

  const getInitials = (name: string | null) =>
    name ? name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() : "?";

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/50 p-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar className="h-9 w-9 border-2 border-primary/30">
          <AvatarImage src={otherUser?.avatar_url ?? ""} />
          <AvatarFallback className="bg-secondary text-xs font-bold">
            {getInitials(otherUser?.full_name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-bold">{otherUser?.full_name ?? "Chat"}</p>
          <p className="text-[10px] text-primary">Online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Mulai percakapan! 💬
          </p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === userId;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                isMine
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "golf-card rounded-bl-md"
              }`}>
                {!isMine && (
                  <p className="text-[10px] font-semibold text-primary mb-0.5">
                    {(msg.profiles as any)?.full_name ?? "User"}
                  </p>
                )}
                <p className="text-sm">{msg.content}</p>
                <p className={`text-[9px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border/50 p-3 flex gap-2">
        <Input
          placeholder="Ketik pesan..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1 h-10 rounded-xl border-border/50 bg-card/80"
        />
        <Button
          size="icon"
          className="h-10 w-10 rounded-xl"
          onClick={handleSend}
          disabled={!message.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ChatRoom;
