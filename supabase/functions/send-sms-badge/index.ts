import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL =
  Deno.env.get("PUBLIC_SITE_URL") ||
  "https://visitbuddy-digital-friend.lovable.app";

async function fetchShortUrl(url: string, longUrl: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${url}${encodeURIComponent(longUrl)}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    if (!text.startsWith("http")) return null;
    return text;
  } catch (e) {
    console.warn("Shortener failed:", (e as Error).message);
    return null;
  }
}

async function shortenUrl(longUrl: string): Promise<string> {
  const isgd = await fetchShortUrl(
    "https://is.gd/create.php?format=simple&url=",
    longUrl,
  );
  if (isgd) return isgd;
  const tinyurl = await fetchShortUrl(
    "https://tinyurl.com/api-create.php?url=",
    longUrl,
  );
  if (tinyurl) return tinyurl;
  console.warn("All shorteners failed; falling back to long URL");
  return longUrl;
}

interface BadgeRequest {
  visitorName: string;
  visitorId: string;
  phone: string;
  company?: string;
  purpose?: string;
  hostName?: string;
  departmentName?: string;
  gateName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const smsStrikerKey = Deno.env.get("SMS_STRIKER_KEY");
    if (!smsStrikerKey) {
      console.error("SMS_STRIKER_KEY is missing");
      return new Response(
        JSON.stringify({ error: "SMS service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const {
      visitorName, 
      visitorId, 
      phone, 
      company, 
      purpose, 
      hostName, 
      departmentName,
      gateName 
    }: BadgeRequest = await req.json();

    // Validate phone number
    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // SMS Striker expects a clean 10-digit Indian mobile number (no +91).
    const digits = String(phone).replace(/\D/g, "").replace(/^0+/, "");
    const strikerPhone = digits.length >= 10 ? digits.slice(-10) : "";
    if (!/^[6-9]\d{9}$/.test(strikerPhone)) {
      console.error(`Invalid Indian mobile: '${phone}' -> '${strikerPhone}'`);
      return new Response(
        JSON.stringify({ error: "Invalid Indian mobile number" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending SMS badge to ${strikerPhone} for visitor ${visitorName}`);

    // DLT-approved template (matches approve-visitor flow registered with SMS Striker).
    const visitDate = new Date().toLocaleDateString("en-GB", {
      day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Kolkata",
    });
    const cleanUrlPart = (s: string) => s.replace(/[^A-Za-z0-9-]/g, "").toUpperCase();
    const longQrUrl = `https://visiguard.sharvisoftwareservices.com/visitor/${cleanUrlPart(visitorId)}`;
    const shortQrUrl = await shortenUrl(longQrUrl);

    const visitorNameSafe = (visitorName || "Visitor").trim();
    const companySafe = (company || "RESL").trim();
    const gateSafe = (gateName || "Main Entry").trim();
    const hostSafe = (hostName || "Host").trim();
    const fromSafe = (departmentName || "RESUST").trim();

    const message =
      `Dear ${visitorNameSafe}, Your visitor access for ${companySafe} is confirmed on ${visitDate} at ${gateSafe}. ` +
      `QR Link: ${shortQrUrl} Host: ${hostSafe} FROM ${fromSafe} Regards: RE SUSTAINABILITY LIMITED`;

    console.log(`SMS message length: ${message.length} characters`);

    // Send via SMS Striker (RESUST sender ID)
    const strikerResp = await fetch("https://www.smsstriker.com/API/sendsmsapi.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: smsStrikerKey,
        from: "RESUST",
        to: strikerPhone,
        msg: message,
        type: "1",
      }),
    });

    const strikerText = (await strikerResp.text()).trim();
    let parsed: any = null;
    try { parsed = JSON.parse(strikerText); } catch { /* not JSON */ }
    const providerStatusCode = parsed?.statusCode ?? parsed?.status ?? null;
    const providerMessage = parsed?.statusMessage ?? parsed?.message ?? strikerText;
    const accepted = strikerResp.ok && (
      providerStatusCode === 200 ||
      providerStatusCode === "200" ||
      /sent|success/i.test(providerMessage || "")
    );

    console.log("SMS Striker response:", JSON.stringify({ httpStatus: strikerResp.status, body: strikerText }));

    if (!accepted) {
      return new Response(
        JSON.stringify({ error: "Failed to send SMS", details: providerMessage }),
        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        provider: "smsstriker",
        jobId: parsed?.["Job Id"] ?? null,
        message: "Badge sent via SMS successfully",
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending SMS badge:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
