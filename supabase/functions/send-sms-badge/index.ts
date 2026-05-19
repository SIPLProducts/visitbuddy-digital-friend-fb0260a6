import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL =
  Deno.env.get("PUBLIC_SITE_URL") ||
  "https://visitbuddy-digital-friend.lovable.app";

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
    // Branded "click" link on the main (DLT-whitelisted) domain. The
    // /click/<code> route redirects to /visitor/<code> in the SPA.
    const clickUrl = `${SITE_URL}/click/${cleanUrlPart(visitorId)}`;

    const visitorNameSafe = (visitorName || "Visitor").trim();
    const companySafe = (company || "RESL").trim();
    const gateSafe = (gateName || "Main Entry").trim();
    const hostSafe = (hostName || "Host").trim();
    const fromSafe = (departmentName || "RESUST").trim();

    const message =
      `Dear ${visitorNameSafe}, Your visitor access for ${companySafe} is confirmed on ${visitDate} at ${gateSafe}. ` +
      `Click: ${clickUrl} Host: ${hostSafe} FROM ${fromSafe} Regards: RE SUSTAINABILITY LIMITED`;

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
