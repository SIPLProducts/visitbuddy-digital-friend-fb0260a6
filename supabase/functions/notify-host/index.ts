import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyHostRequest {
  visitorName: string;
  visitorId: string;
  visitorPhone?: string;
  visitorCompany?: string;
  purpose?: string;
  hostName: string;
  hostPhone: string;
  departmentName?: string;
  gateName?: string;
  photoUrl?: string;
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

    // Clean the WhatsApp number
    twilioWhatsAppNumber = twilioWhatsAppNumber.replace(/^whatsapp:/i, "").trim();

    const { 
      visitorName, 
      visitorId, 
      visitorPhone,
      visitorCompany,
      purpose, 
      hostName, 
      hostPhone,
      departmentName,
      gateName,
      photoUrl
    }: NotifyHostRequest = await req.json();

    console.log(`Notifying host ${hostName} at ${hostPhone} about visitor ${visitorName}`);

    // Validate host phone number
    if (!hostPhone) {
      return new Response(
        JSON.stringify({ error: "Host phone number is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Format phone number for WhatsApp
    let formattedPhone = hostPhone.replace(/\s/g, "").replace(/-/g, "");
    if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+91" + formattedPhone.replace(/^0/, "");
    }

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

    const message = `
🔔 *Visitor Arrival Notification*
━━━━━━━━━━━━━━━━━━━━

Dear *${hostName}*,

A visitor has checked in to meet you:

👤 *Visitor:* ${visitorName}
🆔 *ID:* ${visitorId}
${visitorPhone ? `📱 *Mobile:* ${visitorPhone}` : ""}
${visitorCompany ? `🏢 *Company:* ${visitorCompany}` : ""}
${purpose ? `📋 *Purpose:* ${purpose}` : ""}
${gateName ? `🚪 *Entry Point:* ${gateName}` : ""}

📅 *Date:* ${currentDate}
⏰ *Time:* ${currentTime}

━━━━━━━━━━━━━━━━━━━━
Please proceed to the reception to receive your visitor.

_VisiGuard Visitor Management System_
    `.trim();

    // Send via Twilio WhatsApp API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append("To", `whatsapp:${formattedPhone}`);
    formData.append("From", `whatsapp:${twilioWhatsAppNumber}`);
    formData.append("Body", message);
    
    // Include visitor photo if available
    if (photoUrl) {
      formData.append("MediaUrl", photoUrl);
    }

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
          error: "Failed to send notification",
          details: twilioResult.message || "Unknown error"
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Host notification sent successfully:", twilioResult.sid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: twilioResult.sid,
        message: "Host notified successfully via WhatsApp" 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error notifying host:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
