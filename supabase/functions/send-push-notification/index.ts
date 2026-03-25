import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const vapidPublicKey  = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidEmail      = Deno.env.get("VAPID_EMAIL") ?? "mailto:admin@cfgolf.app";
    const supabaseUrl     = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("VAPID keys not configured");
    }

    // Configure web-push with VAPID details
    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

    const payload = await req.json();
    const record  = payload.record ?? payload;

    const { user_id, title, message, metadata } = record as {
      user_id: string;
      title: string;
      message: string;
      metadata?: { url?: string };
    };

    if (!user_id) throw new Error("user_id missing");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all push subscriptions for this user
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (error) throw error;

    if (!subs || subs.length === 0) {
      console.log(`No subscriptions for user ${user_id}`);
      return new Response(JSON.stringify({ skipped: "no subscriptions" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Sending push to ${subs.length} subscription(s) for user ${user_id}`);

    const pushPayload = JSON.stringify({
      title: title ?? "CFGolf",
      body: message ?? "",
      url: metadata?.url ?? "/notifications",
      tag: "cfgolf-notif",
    });

    const results = await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          };

          await webpush.sendNotification(pushSubscription, pushPayload);
          console.log(`Push sent to ${sub.endpoint.substring(0, 50)}...`);
          return { status: "sent" };
        } catch (err: any) {
          console.error(`Push failed: ${err.message}, statusCode: ${err.statusCode}`);

          // Remove expired/invalid subscriptions
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
            console.log("Removed expired subscription");
            return { status: "removed_expired" };
          }
          return { status: "failed", error: err.message };
        }
      })
    );

    console.log("Results:", JSON.stringify(results));
    return new Response(JSON.stringify({ sent: subs.length, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
