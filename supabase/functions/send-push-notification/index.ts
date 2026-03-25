import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── VAPID helpers (pure Web Crypto, no external deps) ──────────────────────

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (padded.length % 4)) % 4;
  const raw = atob(padded + "=".repeat(padding));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function importVapidPrivateKey(base64PrivKey: string): Promise<CryptoKey> {
  // VAPID private keys from vapidkeys.com are raw 32-byte P-256 scalars in base64url
  const rawKey = base64UrlDecode(base64PrivKey);

  // Build PKCS8 DER wrapper for P-256 private key
  // ECPrivateKey ::= SEQUENCE { version INTEGER (1), privateKey OCTET STRING, ... }
  const der = new Uint8Array([
    0x30, 0x41,                         // SEQUENCE
    0x02, 0x01, 0x00,                   // version 0
    0x30, 0x13,                         // AlgorithmIdentifier
      0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, // OID ecPublicKey
      0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, // OID prime256v1
    0x04, 0x27,                         // OCTET STRING (ECPrivateKey)
      0x30, 0x25,
        0x02, 0x01, 0x01,
        0x04, 0x20, ...rawKey,
  ]);

  return await crypto.subtle.importKey(
    "pkcs8", der,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}

async function buildVapidJWT(audience: string, privateKey: CryptoKey): Promise<string> {
  const vapidEmail = Deno.env.get("VAPID_EMAIL") ?? "mailto:admin@cfgolf.app";
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";

  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: vapidEmail,
  };

  const enc = new TextEncoder();
  const signingInput =
    base64UrlEncode(enc.encode(JSON.stringify(header)).buffer) +
    "." +
    base64UrlEncode(enc.encode(JSON.stringify(payload)).buffer);

  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    enc.encode(signingInput)
  );

  return signingInput + "." + base64UrlEncode(sig);
}

// ── Web Push encryption (RFC 8291 / aes128gcm) ─────────────────────────────

async function encryptPushPayload(
  plaintext: string,
  p256dhBase64: string,
  authBase64: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const enc = new TextEncoder();
  const authSecret = base64UrlDecode(authBase64);
  const receiverPublicKeyBytes = base64UrlDecode(p256dhBase64);

  // Import receiver public key
  const receiverPublicKey = await crypto.subtle.importKey(
    "raw", receiverPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    true, []
  );

  // Generate ephemeral sender key pair
  const senderKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]
  );

  const senderPublicKeyBytes = new Uint8Array(
    await crypto.subtle.exportKey("raw", senderKeyPair.publicKey)
  );

  // ECDH shared secret
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: receiverPublicKey },
    senderKeyPair.privateKey, 256
  );

  // PRK_key = HMAC-SHA-256(auth_secret, shared_secret || "WebPush: info\0" || receiver_pub || sender_pub)
  const hkdfKey = await crypto.subtle.importKey("raw", sharedBits, "HKDF", false, ["deriveBits"]);

  const keyInfo = new Uint8Array([
    ...enc.encode("WebPush: info\x00"),
    ...receiverPublicKeyBytes,
    ...senderPublicKeyBytes,
  ]);
  const prkKey = await crypto.subtle.importKey(
    "raw",
    await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: authSecret, info: keyInfo }, hkdfKey, 256),
    "HKDF", false, ["deriveBits"]
  );

  // Salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Content-encryption key (16 bytes)
  const cekInfo = enc.encode("Content-Encoding: aes128gcm\x00");
  const cekBits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: cekInfo }, prkKey, 128);

  // Nonce (12 bytes)
  const nonceInfo = enc.encode("Content-Encoding: nonce\x00");
  const nonceBits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: nonceInfo }, prkKey, 96);

  const aesKey = await crypto.subtle.importKey("raw", cekBits, "AES-GCM", false, ["encrypt"]);

  // Encrypt: plaintext + \x02 padding delimiter
  const paddedPlaintext = new Uint8Array([...enc.encode(plaintext), 0x02]);
  const cipherWithTag = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonceBits }, aesKey, paddedPlaintext)
  );

  // aes128gcm content-encoding header (86 bytes)
  // salt (16) + rs (4) + keyid_len (1) + sender_public_key (65)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);

  const header = new Uint8Array(16 + 4 + 1 + senderPublicKeyBytes.length);
  header.set(salt, 0);
  header.set(rs, 16);
  header[20] = senderPublicKeyBytes.length;
  header.set(senderPublicKeyBytes, 21);

  const ciphertext = new Uint8Array(header.length + cipherWithTag.length);
  ciphertext.set(header, 0);
  ciphertext.set(cipherWithTag, header.length);

  return { ciphertext, salt, serverPublicKey: senderPublicKeyBytes };
}

// ── Main handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const vapidPrivKeyB64 = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPublicKey  = Deno.env.get("VAPID_PUBLIC_KEY");
    const supabaseUrl     = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!vapidPrivKeyB64 || !vapidPublicKey) {
      throw new Error("VAPID keys not configured in Supabase secrets");
    }

    const payload = await req.json();
    const record  = payload.record ?? payload;

    // Expect: { user_id, title, message, metadata: { url? } }
    const { user_id, title, message, metadata } = record as {
      user_id: string;
      title: string;
      message: string;
      metadata?: { url?: string };
    };

    if (!user_id) throw new Error("user_id missing from notification record");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all push subscriptions for this user
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (error) throw error;
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ skipped: "no subscriptions" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const privateKey = await importVapidPrivateKey(vapidPrivKeyB64);
    const pushData = JSON.stringify({
      title: title ?? "CFGolf",
      body: message ?? "",
      url: metadata?.url ?? "/notifications",
      tag: "cfgolf-notif",
    });

    const results = await Promise.allSettled(
      subs.map(async (sub) => {
        const urlObj = new URL(sub.endpoint);
        const audience = `${urlObj.protocol}//${urlObj.host}`;
        const jwt = await buildVapidJWT(audience, privateKey);

        const { ciphertext } = await encryptPushPayload(pushData, sub.p256dh, sub.auth);

        const res = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "aes128gcm",
            "Authorization": `vapid t=${jwt},k=${vapidPublicKey}`,
            "TTL": "86400",
          },
          body: ciphertext,
        });

        if (!res.ok && res.status === 410) {
          // Subscription expired — remove from DB
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          return { endpoint: sub.endpoint, status: "removed_expired" };
        }

        return { endpoint: sub.endpoint, status: res.status };
      })
    );

    console.log("Push results:", JSON.stringify(results));
    return new Response(JSON.stringify({ sent: results.length, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("send-push-notification error:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
