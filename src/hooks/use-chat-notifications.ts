import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Global hook that listens for incoming chat messages via Supabase Realtime.
 * Shows a toast notification when a message arrives and user is NOT on that chat page.
 * Returns the count of unread conversations.
 */
export function useChatNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const location = useLocation();

  // Track auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserId(session?.user?.id ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Subscribe to new messages across all user's conversations
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("global-chat-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        async (payload) => {
          const msg = payload.new as any;

          // Ignore own messages
          if (msg.sender_id === userId) return;

          // Check if user is a participant of this conversation
          const { data: participant } = await supabase
            .from("conversation_participants")
            .select("conversation_id")
            .eq("conversation_id", msg.conversation_id)
            .eq("user_id", userId)
            .limit(1);

          if (!participant || participant.length === 0) return;

          // If user is currently viewing this chat, don't notify
          const currentPath = window.location.pathname;
          if (currentPath === `/chat/${msg.conversation_id}`) return;

          // Get sender name
          const { data: sender } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", msg.sender_id)
            .single();

          const senderName = sender?.full_name ?? "Someone";

          // Show toast notification
          toast.message(`💬 ${senderName}`, {
            description: msg.content.length > 60
              ? msg.content.substring(0, 60) + "..."
              : msg.content,
            action: {
              label: "Buka",
              onClick: () => {
                window.location.href = `/chat/${msg.conversation_id}`;
              },
            },
            duration: 5000,
          });

          // Increment unread count
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Reset unread count when visiting chat pages
  useEffect(() => {
    if (location.pathname.startsWith("/chat")) {
      setUnreadCount(0);
    }
  }, [location.pathname]);

  const resetUnread = useCallback(() => setUnreadCount(0), []);

  return { unreadCount, resetUnread };
}
