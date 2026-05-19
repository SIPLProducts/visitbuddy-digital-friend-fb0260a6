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
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioSmsNumber = Deno.env.get("TWILIO_SMS_NUMBER");

    if (!accountSid || !authToken || !twilioSmsNumber) {
      console.error("Missing Twilio SMS credentials");
      return new Response(
        JSON.stringify({ error: "SMS service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Using Twilio SMS From number: ${twilioSmsNumber}`);

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

    // Format phone number for SMS (remove spaces, ensure + prefix)
    let formattedPhone = phone.replace(/\s/g, "").replace(/-/g, "");
    if (!formattedPhone.startsWith("+")) {
      // Assume Indian number if no country code
      formattedPhone = "+91" + formattedPhone.replace(/^0/, "");
    }

    console.log(`Sending SMS badge to ${formattedPhone} for visitor ${visitorName}`);

    // Create the badge message (SMS has 160 char limit per segment, keep it concise)
    const currentDate = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });

    const currentTime = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    });

    // Build a concise SMS message
    let message = `VisiGuard Badge\n`;
    message += `Name: ${visitorName}\n`;
    message += `ID: ${visitorId}\n`;
    if (company) message += `Company: ${company}\n`;
    if (hostName) message += `Host: ${hostName}\n`;
    if (departmentName) message += `Dept: ${departmentName}\n`;
    if (gateName) message += `Gate: ${gateName}\n`;
    message += `Date: ${currentDate}\n`;
    message += `Time: ${currentTime}\n`;
    message += `\nShow this at security desk.`;

    console.log(`SMS message length: ${message.length} characters`);

    // Send via Twilio SMS API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append("To", formattedPhone);
    formData.append("From", twilioSmsNumber);
    formData.append("Body", message);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    const twilioResult = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("Twilio SMS error:", twilioResult);
      return new Response(
        JSON.stringify({ 
          error: "Failed to send SMS",
          details: twilioResult.message || "Unknown error"
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("SMS badge sent successfully:", twilioResult.sid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: twilioResult.sid,
        message: "Badge sent via SMS successfully" 
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
