import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VehicleBadgeRequest {
  vehicleNumber: string;
  vehicleId: string;
  vehicleType: string;
  driverName: string;
  phone: string;
  company?: string;
  purpose?: string;
  gateName?: string;
  locationName?: string;
}

const handler = async (req: Request): Promise<Response> => {
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

    twilioWhatsAppNumber = twilioWhatsAppNumber.replace(/^whatsapp:/i, "").trim();
    console.log(`Using Twilio WhatsApp From number: ${twilioWhatsAppNumber}`);

    const { 
      vehicleNumber,
      vehicleId, 
      vehicleType,
      driverName,
      phone, 
      company, 
      purpose, 
      gateName,
      locationName
    }: VehicleBadgeRequest = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let formattedPhone = phone.replace(/\s/g, "").replace(/-/g, "");
    if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+91" + formattedPhone.replace(/^0/, "");
    }

    console.log(`Sending WhatsApp vehicle badge to ${formattedPhone} for vehicle ${vehicleNumber}`);

    const currentDate = new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Kolkata",
    });

    const currentTime = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    });

    // Generate QR code with vehicle data for gate scanning
    const qrCodeData = encodeURIComponent(JSON.stringify({
      visitorId: vehicleId,
      vehicleId: vehicleId,
      vehicleNumber: vehicleNumber,
      name: driverName,
      type: "vehicle",
      action: "checkout",
      timestamp: new Date().toISOString()
    }));
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrCodeData}&format=png`;

    const message = `
🚛 *VisiGuard Vehicle Pass*
━━━━━━━━━━━━━━━━━━━━

🚗 *Vehicle:* ${vehicleNumber}
🆔 *Pass ID:* ${vehicleId}
📦 *Type:* ${vehicleType}
👤 *Driver:* ${driverName}
${company ? `🏢 *Company:* ${company}` : ""}
${purpose ? `📋 *Purpose:* ${purpose}` : ""}
${locationName ? `📍 *Location:* ${locationName}` : ""}
${gateName ? `🚪 *Entry Gate:* ${gateName}` : ""}

📅 *Date:* ${currentDate}
⏰ *Time:* ${currentTime}

━━━━━━━━━━━━━━━━━━━━
📱 *Scan the QR code above at the gate*
✅ Show this pass to security for entry.
    `.trim();

    console.log(`Generated QR code URL: ${qrCodeUrl}`);

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

    console.log("WhatsApp vehicle badge sent successfully:", twilioResult.sid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: twilioResult.sid,
        message: "Vehicle pass sent to WhatsApp successfully" 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error sending WhatsApp vehicle badge:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
