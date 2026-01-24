import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyHostRequest {
  visitorId: string; // This is the UUID (id column)
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!accountSid || !authToken || !twilioWhatsAppNumber) {
      console.error("Missing Twilio credentials");
      return new Response(
        JSON.stringify({ error: "WhatsApp service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      return new Response(
        JSON.stringify({ error: "Database service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Clean the WhatsApp number
    twilioWhatsAppNumber = twilioWhatsAppNumber.replace(/^whatsapp:/i, "").trim();

    const { visitorId }: NotifyHostRequest = await req.json();

    if (!visitorId) {
      return new Response(
        JSON.stringify({ error: "Visitor ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Fetching visitor details for ID: ${visitorId}`);

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch visitor details
    const { data: visitor, error: visitorError } = await supabase
      .from("visitors")
      .select("id, visitor_id, name, phone, company, purpose, photo_url, host_id, department_id, gate_id")
      .eq("id", visitorId)
      .single();

    if (visitorError || !visitor) {
      console.error("Failed to fetch visitor:", visitorError);
      return new Response(
        JSON.stringify({ error: "Visitor not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Visitor data:", JSON.stringify(visitor));

    // Check if host_id exists
    if (!visitor.host_id) {
      console.log("No host assigned to this visitor");
      return new Response(
        JSON.stringify({ success: true, message: "No host assigned, notification skipped" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get host details from employees table
    const { data: hostData, error: hostError } = await supabase
      .from("employees")
      .select("id, name, email")
      .eq("id", visitor.host_id)
      .single();

    if (hostError || !hostData) {
      console.error("Failed to fetch host details:", hostError);
      return new Response(
        JSON.stringify({ error: "Host not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch gate name if gate_id exists
    let gateName = "";
    if (visitor.gate_id) {
      const { data: gateData } = await supabase
        .from("gates")
        .select("name")
        .eq("id", visitor.gate_id)
        .single();
      gateName = gateData?.name || "";
    }

    // Fetch department name if department_id exists
    let departmentName = "";
    if (visitor.department_id) {
      const { data: deptData } = await supabase
        .from("departments")
        .select("name")
        .eq("id", visitor.department_id)
        .single();
      departmentName = deptData?.name || "";
    }

    console.log(`Host ${hostData.name} (${hostData.email}) should be notified about visitor ${visitor.name}`);

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

    // If we had the host's phone, we would send this message:
    const message = `
🔔 *Visitor Arrival Notification*
━━━━━━━━━━━━━━━━━━━━

Dear *${hostData.name}*,

A visitor has checked in to meet you:

👤 *Visitor:* ${visitor.name}
🆔 *ID:* ${visitor.visitor_id}
${visitor.phone ? `📱 *Mobile:* ${visitor.phone}` : ""}
${visitor.company ? `🏢 *Company:* ${visitor.company}` : ""}
${visitor.purpose ? `📋 *Purpose:* ${visitor.purpose}` : ""}
${gateName ? `🚪 *Entry Point:* ${gateName}` : ""}

📅 *Date:* ${currentDate}
⏰ *Time:* ${currentTime}

━━━━━━━━━━━━━━━━━━━━
Please proceed to the reception to receive your visitor.

_VisiGuard Visitor Management System_
    `.trim();

    console.log("Notification message prepared:", message);

    // If we have the visitor's phone, send them a confirmation that host was notified
    if (visitor.phone) {
      let formattedPhone = visitor.phone.replace(/\s/g, "").replace(/-/g, "");
      if (!formattedPhone.startsWith("+")) {
        formattedPhone = "+91" + formattedPhone.replace(/^0/, "");
      }

      const visitorMessage = `
✅ *Check-in Confirmed*
━━━━━━━━━━━━━━━━━━━━

Dear *${visitor.name}*,

Your check-in has been recorded successfully!

🆔 *Visitor ID:* ${visitor.visitor_id}
${hostData.name ? `👤 *Host:* ${hostData.name}` : ""}
${departmentName ? `🏢 *Department:* ${departmentName}` : ""}
${gateName ? `🚪 *Entry Gate:* ${gateName}` : ""}

📅 *Date:* ${currentDate}
⏰ *Time:* ${currentTime}

Your host has been notified of your arrival.
Please wait at the reception area.

_VisiGuard Visitor Management System_
      `.trim();

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      
      const formData = new URLSearchParams();
      formData.append("To", `whatsapp:${formattedPhone}`);
      formData.append("From", `whatsapp:${twilioWhatsAppNumber}`);
      formData.append("Body", visitorMessage);

      try {
        const twilioResponse = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData,
        });

        const twilioResult = await twilioResponse.json();

        if (twilioResponse.ok) {
          console.log("Visitor confirmation sent:", twilioResult.sid);
        } else {
          console.error("Failed to send visitor confirmation:", twilioResult);
        }
      } catch (whatsappError) {
        console.error("WhatsApp send error:", whatsappError);
      }
    }

    // Create in-app notification for the host (if we have user_id)
    // This would require linking employees to auth users

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Host notification processed",
        visitor: {
          id: visitor.visitor_id,
          name: visitor.name
        },
        host: {
          name: hostData.name,
          email: hostData.email
        }
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
