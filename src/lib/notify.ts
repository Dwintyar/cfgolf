import { supabase } from "@/integrations/supabase/client";

/**
 * Centralised notification writer.
 *
 * Inserting a row into `notifications` is what triggers the Supabase Database
 * Webhook -> `send-push-notification` Edge Function -> web push.
 * Never insert into `notifications` directly from a component; use these helpers
 * so every flow behaves the same way.
 *
 * Failures are logged but never thrown: a missing notification must not roll
 * back or block the user action that produced it.
 */

export type NotifyPayload = {
  title: string;
  message: string;
  type: string;
  metadata?: Record<string, unknown>;
};

/** Notify a single user. No-op when userId is empty. */
export async function notifyUser(userId: string | null | undefined, payload: NotifyPayload) {
  if (!userId) return;
  await notifyUsers([userId], payload);
}

/** Notify several users at once. Duplicates and empty ids are dropped. */
export async function notifyUsers(
  userIds: (string | null | undefined)[],
  payload: NotifyPayload,
) {
  const ids = Array.from(new Set(userIds.filter(Boolean) as string[]));
  if (ids.length === 0) return;

  const rows = ids.map((user_id) => ({
    user_id,
    title: payload.title,
    message: payload.message,
    type: payload.type,
    metadata: (payload.metadata ?? null) as never,
  }));

  const { error } = await supabase.from("notifications").insert(rows);
  if (error) console.error("[notify] insert failed:", error.message);
}

/**
 * Notify the owners and admins of a club.
 * `excludeUserId` keeps the actor from notifying themselves.
 */
export async function notifyClubAdmins(
  clubId: string | null | undefined,
  payload: NotifyPayload,
  excludeUserId?: string | null,
) {
  if (!clubId) return;

  const { data, error } = await supabase
    .from("members")
    .select("user_id")
    .eq("club_id", clubId)
    .in("role", ["owner", "admin"]);

  if (error) {
    console.error("[notify] club admin lookup failed:", error.message);
    return;
  }

  await notifyUsers(
    (data ?? []).map((m) => m.user_id).filter((uid) => uid !== excludeUserId),
    payload,
  );
}

/**
 * Notify a user about a new chat message, but only once per conversation until
 * they have read it. Without this guard a long back-and-forth would create one
 * row (and one push) per message and bury the notifications page.
 */
export async function notifyChatMessage(
  recipientId: string,
  conversationId: string,
  senderName: string,
  preview: string,
) {
  if (!recipientId || !conversationId) return;

  const { data: pending, error } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", recipientId)
    .eq("type", "chat")
    .eq("is_read", false)
    .filter("metadata->>conversation_id", "eq", conversationId)
    .limit(1);

  if (error) {
    console.error("[notify] chat dedupe check failed:", error.message);
    return;
  }
  if (pending && pending.length > 0) return; // already has an unread ping

  await notifyUser(recipientId, {
    title: `New message from ${senderName}`,
    message: preview.length > 120 ? `${preview.slice(0, 117)}...` : preview,
    type: "chat",
    metadata: { conversation_id: conversationId, url: `/chat/${conversationId}` },
  });
}
