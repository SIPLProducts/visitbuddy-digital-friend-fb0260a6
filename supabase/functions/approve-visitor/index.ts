import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalRequest {
  visitorId: string;
  action: 'approve' | 'reject';
  token?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    let twilioWhatsAppNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER");
    let twilioSmsNumber = Deno.env.get("TWILIO_SMS_NUMBER");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { visitorId, action, token }: ApprovalRequest = await req.json();

    if (!visitorId || !action) {
      return new Response(
        JSON.stringify({ error: "Visitor ID and action are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Processing ${action} for visitor: ${visitorId}`);

    // Fetch visitor details
    const { data: visitor, error: visitorError } = await supabase
      .from('visitors')
      .select(`
        *,
        host:employees(*),
        department:departments(*),
        gate:gates(*)
      `)
      .eq('id', visitorId)
      .maybeSingle();

    if (visitorError || !visitor) {
      console.error("Error fetching visitor:", visitorError);
      return new Response(
        JSON.stringify({ error: "Visitor not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (visitor.status !== 'pending_approval') {
      return new Response(
        JSON.stringify({ 
          error: "Visitor is not pending approval",
          currentStatus: visitor.status
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === 'reject') {
      // Update status to cancelled
      const { error: updateError } = await supabase
        .from('visitors')
        .update({ status: 'cancelled' })
        .eq('id', visitorId);

      if (updateError) {
        console.error("Error rejecting visitor:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to reject visitor" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log(`Visitor ${visitorId} rejected`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Visitor rejected successfully",
          action: 'rejected'
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Approve the visitor - update status to scheduled
    const { error: updateError } = await supabase
      .from('visitors')
      .update({ status: 'scheduled' })
      .eq('id', visitorId);

    if (updateError) {
      console.error("Error approving visitor:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to approve visitor" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Visitor ${visitorId} approved, sending badge...`);

    // Notify gate security users at the visitor's location
    const locationId = visitor.gate?.location_id;
    if (locationId) {
      const { data: securityUsers, error: secError } = await supabase
        .from('user_location_roles')
        .select('user_id')
        .eq('location_id', locationId)
        .eq('role', 'gate_security');

      if (secError) {
        console.error("Error fetching gate security users:", secError);
      } else if (securityUsers && securityUsers.length > 0) {
        const notifications = securityUsers.map((u: { user_id: string }) => ({
          user_id: u.user_id,
          title: "Visitor Approved",
          message: `${visitor.name} has been approved by host. Ready for check-in.`,
          type: "success",
        }));

        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notifError) {
          console.error("Error inserting gate security notifications:", notifError);
        } else {
          console.log(`Notified ${securityUsers.length} gate security user(s)`);
        }
      }
    }

    let whatsappSent = false;
    let smsSent = false;
    let whatsappSid = null;
    let smsSid = null;

    // Send badge via WhatsApp if Twilio is configured and visitor has phone
    if (accountSid && authToken && twilioWhatsAppNumber && visitor.phone) {
      twilioWhatsAppNumber = twilioWhatsAppNumber.replace(/^whatsapp:/i, "").trim();
      
      let formattedPhone = visitor.phone.replace(/\s/g, "").replace(/-/g, "");
      if (!formattedPhone.startsWith("+")) {
        formattedPhone = "+91" + formattedPhone.replace(/^0/, "");
      }

      const currentDate = new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const qrCodeData = encodeURIComponent(JSON.stringify({
        visitorId: visitor.id,
        name: visitor.name,
        action: 'checkout',
        timestamp: new Date().toISOString()
      }));
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrCodeData}&format=png`;

      const message = `
🎫 *VisiGuard Visitor Pass - APPROVED*
━━━━━━━━━━━━━━━━━━━━

✅ Your visit has been approved!

👤 *Name:* ${visitor.name}
🆔 *Visitor ID:* ${visitor.visitor_id}
${visitor.company ? `🏢 *Company:* ${visitor.company}` : ""}
${visitor.purpose ? `📋 *Purpose:* ${visitor.purpose}` : ""}
${visitor.host?.name ? `👔 *Host:* ${visitor.host.name}` : ""}
${visitor.department?.name ? `🏛️ *Department:* ${visitor.department.name}` : ""}
${visitor.gate?.name ? `🚪 *Entry Gate:* ${visitor.gate.name}` : ""}

📅 *Date:* ${currentDate}

━━━━━━━━━━━━━━━━━━━━
📱 *Show this badge at the security desk*
📸 *Scan QR for quick check-out*

_Powered by VisiGuard VMS_
      `.trim();

      try {
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

        if (twilioResponse.ok) {
          whatsappSent = true;
          whatsappSid = twilioResult.sid;
          console.log("WhatsApp badge sent:", twilioResult.sid);
        } else {
          console.error("Twilio WhatsApp error:", twilioResult);
        }
      } catch (whatsappError) {
        console.error("Error sending WhatsApp:", whatsappError);
      }
    }

    // Send SMS notification if Twilio SMS is configured
    if (accountSid && authToken && twilioSmsNumber && visitor.phone) {
      twilioSmsNumber = twilioSmsNumber.replace(/^sms:/i, "").trim();
      
      let formattedPhone = visitor.phone.replace(/\s/g, "").replace(/-/g, "");
      if (!formattedPhone.startsWith("+")) {
        formattedPhone = "+91" + formattedPhone.replace(/^0/, "");
      }

      const smsMessage = `VisiGuard: Your visit is APPROVED! ID: ${visitor.visitor_id}. Show this at security. Host: ${visitor.host?.name || 'N/A'}. Check WhatsApp for full badge.`;

      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const formData = new URLSearchParams();
        formData.append("To", formattedPhone);
        formData.append("From", twilioSmsNumber);
        formData.append("Body", smsMessage);

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
          smsSent = true;
          smsSid = twilioResult.sid;
          console.log("SMS notification sent:", twilioResult.sid);
        } else {
          console.error("Twilio SMS error:", twilioResult);
        }
      } catch (smsError) {
        console.error("Error sending SMS:", smsError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Visitor approved successfully",
        action: 'approved',
        notifications: {
          whatsapp: whatsappSent,
          whatsappSid,
          sms: smsSent,
          smsSid
        }
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in approve-visitor:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
