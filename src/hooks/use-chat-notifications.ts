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

  // Subscribe to club invitations (both incoming invites AND join requests for owners)
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("global-club-invite-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "club_invitations",
        },
        async (payload) => {
          const inv = payload.new as any;

          // Case 1: Someone invited this user to a club
          if (inv.invited_user_id === userId && inv.invited_by !== userId) {
            const { data: club } = await supabase
              .from("clubs")
              .select("name")
              .eq("id", inv.club_id)
              .single();

            toast.message(`🏌️ Undangan Club`, {
              description: `${club?.name ?? "A club"} mengundang kamu untuk bergabung!`,
              action: {
                label: "Lihat",
                onClick: () => {
                  window.location.href = "/notifications";
                },
              },
              duration: 6000,
            });
            return;
          }

          // Case 2: Someone requested to join a club this user owns (invited_by === invited_user_id)
          if (inv.invited_by === inv.invited_user_id && inv.invited_user_id !== userId) {
            const { data: club } = await supabase
              .from("clubs")
              .select("name, owner_id")
              .eq("id", inv.club_id)
              .single();

            if (!club || club.owner_id !== userId) return;

            const { data: requester } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", inv.invited_user_id)
              .single();

            toast.message(`📋 Permintaan Bergabung`, {
              description: `${requester?.full_name ?? "Seseorang"} ingin bergabung ke ${club.name}`,
              action: {
                label: "Lihat",
                onClick: () => {
                  window.location.href = `/clubs/${inv.club_id}`;
                },
              },
              duration: 6000,
            });
          }
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
