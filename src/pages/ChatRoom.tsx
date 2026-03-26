import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ChatRoom = () => {
  const navigate = useNavigate();
  const { id: conversationId } = useParams<{ id: string }>();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/login", { replace: true });
      else setUserId(session.user.id);
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserId(session?.user?.id ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Load other participant with handicap
  const { data: otherUser } = useQuery({
    queryKey: ["chat-participant", conversationId, userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversation_participants")
        .select("user_id, profiles(full_name, avatar_url, handicap)")
        .eq("conversation_id", conversationId!)
        .neq("user_id", userId!);
      return (data?.[0]?.profiles as any) ?? null;
    },
    enabled: authReady && !!conversationId && !!userId,
  });

  // Load initial messages
  useEffect(() => {
    if (!conversationId || !userId || !authReady) return;
    const load = async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*, profiles:sender_id(full_name, avatar_url)")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("Failed to load messages:", error);
        return;
      }
      if (data) setMessages(data);
    };
    load();
  }, [conversationId, userId, authReady]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId || !authReady) return;
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
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, { ...payload.new, profiles: data }];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, authReady]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !userId || !conversationId) return;
    const text = message.trim();
    setMessage("");
    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: text,
    });
    setSending(false);
    if (error) {
      console.error("Send failed:", error);
      toast.error("Gagal mengirim pesan");
      setMessage(text);
    }
  };

  const getInitials = (name: string | null) =>
    name ? name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() : "?";

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (!authReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/50 p-4 bg-card">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar className="h-9 w-9 border-2 border-primary/30">
          <AvatarImage src={otherUser?.avatar_url ?? ""} />
          <AvatarFallback className="bg-secondary text-xs font-bold">
            {getInitials(otherUser?.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">{otherUser?.full_name ?? "Loading..."}</p>
        </div>
        {otherUser?.handicap != null && (
          <span className="text-[10px] font-bold bg-primary/15 text-primary px-2 py-0.5 rounded-full shrink-0">
            HCP {otherUser.handicap}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Send className="h-7 w-7 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">Start the conversation! 💬</p>
            <p className="text-xs text-muted-foreground mt-1">Type a message below to begin</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === userId;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                isMine
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border/50 rounded-bl-md"
              }`}>
                {!isMine && (
                  <p className="text-[10px] font-semibold text-primary mb-0.5">
                    {(msg.profiles as any)?.full_name ?? "User"}
                  </p>
                )}
                <p className="text-sm">{msg.content}</p>
                <p className={`text-[9px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border/50 p-3 flex gap-2 bg-card">
        <Input
          placeholder="Tulis pesan..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          className="flex-1 h-10 rounded-xl border-border/50 bg-background"
        />
        <Button
          size="icon"
          className="h-10 w-10 rounded-xl"
          onClick={handleSend}
          disabled={!message.trim() || sending}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};

export default ChatRoom;
