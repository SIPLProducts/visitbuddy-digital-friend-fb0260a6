import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    let twilioWhatsAppNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

    if (!accountSid || !authToken || !twilioWhatsAppNumber) {
      console.error("Missing Twilio credentials");
      return new Response(
        JSON.stringify({ error: "WhatsApp service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Clean the WhatsApp number - remove any existing "whatsapp:" prefix to avoid duplication
    twilioWhatsAppNumber = twilioWhatsAppNumber.replace(/^whatsapp:/i, "").trim();
    
    console.log(`Using Twilio WhatsApp From number: ${twilioWhatsAppNumber}`);

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

    // Format phone number for WhatsApp (remove spaces, ensure + prefix)
    let formattedPhone = phone.replace(/\s/g, "").replace(/-/g, "");
    if (!formattedPhone.startsWith("+")) {
      // Assume Indian number if no country code
      formattedPhone = "+91" + formattedPhone.replace(/^0/, "");
    }

    console.log(`Sending WhatsApp badge to ${formattedPhone} for visitor ${visitorName}`);

    // Create the badge message
    const currentDate = new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const currentTime = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Generate QR code URL with visitor ID for quick check-in scanning
    const qrCodeData = encodeURIComponent(JSON.stringify({
      visitorId,
      name: visitorName,
      timestamp: new Date().toISOString()
    }));
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrCodeData}&format=png`;

    const message = `
🎫 *VisiGuard Visitor Badge*
━━━━━━━━━━━━━━━━━━━━

👤 *Name:* ${visitorName}
🆔 *Visitor ID:* ${visitorId}
${company ? `🏢 *Company:* ${company}` : ""}
${purpose ? `📋 *Purpose:* ${purpose}` : ""}
${hostName ? `👔 *Host:* ${hostName}` : ""}
${departmentName ? `🏛️ *Department:* ${departmentName}` : ""}
${gateName ? `🚪 *Entry Gate:* ${gateName}` : ""}

📅 *Date:* ${currentDate}
⏰ *Time:* ${currentTime}

━━━━━━━━━━━━━━━━━━━━
📱 *Scan the QR code above for quick check-in*
✅ Please show this badge at the security desk.

_Powered by VisiGuard VMS_
    `.trim();

    console.log(`Generated QR code URL: ${qrCodeUrl}`);

    // Send via Twilio WhatsApp API with QR code image
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append("To", `whatsapp:${formattedPhone}`);
    formData.append("From", `whatsapp:${twilioWhatsAppNumber}`);
    formData.append("Body", message);
    formData.append("MediaUrl", qrCodeUrl);

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
      console.error("Twilio error:", twilioResult);
      return new Response(
        JSON.stringify({ 
          error: "Failed to send WhatsApp message",
          details: twilioResult.message || "Unknown error"
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("WhatsApp badge sent successfully:", twilioResult.sid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: twilioResult.sid,
        message: "Badge sent to WhatsApp successfully" 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error sending WhatsApp badge:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
