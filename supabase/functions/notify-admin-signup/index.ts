import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const payload = await req.json();

    // Database webhook sends { type, table, record, ... }
    const record = payload.record ?? payload;
    const fullName = record.full_name ?? "Tidak diketahui";
    const userEmail = record.email ?? "Tidak diketahui";
    const requestedAt = record.requested_at
      ? new Date(record.requested_at).toLocaleString("id-ID", {
          dateStyle: "long",
          timeStyle: "short",
          timeZone: "Asia/Jakarta",
        })
      : new Date().toLocaleString("id-ID", {
          dateStyle: "long",
          timeStyle: "short",
          timeZone: "Asia/Jakarta",
        });

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; padding: 40px 0;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: #16a34a; padding: 24px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Pendaftaran Baru CFGolf</h1>
    </div>
    <div style="padding: 24px;">
      <p style="margin: 0 0 16px; color: #3f3f46; font-size: 14px; line-height: 1.6;">
        Ada pengguna baru yang mendaftar dan menunggu persetujuan:
      </p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 10px 12px; background: #f4f4f5; font-size: 13px; color: #71717a; width: 90px; border-radius: 6px 0 0 0;">Nama</td>
          <td style="padding: 10px 12px; background: #f4f4f5; font-size: 13px; color: #18181b; font-weight: 600; border-radius: 0 6px 0 0;">${fullName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; font-size: 13px; color: #71717a;">Email</td>
          <td style="padding: 10px 12px; font-size: 13px; color: #18181b; font-weight: 600;">${userEmail}</td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; background: #f4f4f5; font-size: 13px; color: #71717a; border-radius: 0 0 0 6px;">Waktu</td>
          <td style="padding: 10px 12px; background: #f4f4f5; font-size: 13px; color: #18181b; font-weight: 600; border-radius: 0 0 6px 0;">${requestedAt}</td>
        </tr>
      </table>
      <div style="text-align: center;">
        <a href="https://cfgolf.lovable.app/admin/approvals"
           style="display: inline-block; background: #16a34a; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
          Klik di sini untuk menyetujui atau menolak
        </a>
      </div>
    </div>
    <div style="padding: 16px 24px; background: #fafafa; text-align: center;">
      <p style="margin: 0; font-size: 11px; color: #a1a1aa;">CFGolf System · Email otomatis</p>
    </div>
  </div>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "CFGolf System <onboarding@resend.dev>",
        to: ["dwintyar@gmail.com"],
        subject: "CFGolf – Ada pendaftaran baru menunggu persetujuan",
        html: htmlBody,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", result);
      return new Response(JSON.stringify({ error: result }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Email sent successfully:", result);
    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
