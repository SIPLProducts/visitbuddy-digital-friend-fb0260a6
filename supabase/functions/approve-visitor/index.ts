import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalRequest {
  visitorId: string;
  action: 'approve' | 'reject';
  token?: string;
}

async function sendSmtpEmail(
  supabase: any,
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    const { data: smtp } = await supabase
      .from("email_config")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (!smtp) {
      console.warn("No active SMTP config found, skipping email");
      return false;
    }

    const transporter = nodemailer.createTransport({
      host: smtp.smtp_host,
      port: smtp.smtp_port,
      secure: smtp.smtp_port === 465,
      auth: { user: smtp.smtp_username, pass: smtp.smtp_password },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: smtp.sender_name
        ? `"${smtp.sender_name}" <${smtp.sender_email}>`
        : smtp.sender_email,
      to,
      subject,
      html,
    });

    await supabase.from("email_logs").insert({
      subject,
      body: html,
      recipients: [to],
      status: "sent",
      template: "approve-visitor",
    });

    console.log(`Email sent to ${to}: ${subject}`);
    return true;
  } catch (err: any) {
    console.error(`Failed to send email to ${to}:`, err.message);
    await supabase.from("email_logs").insert({
      subject,
      body: html,
      recipients: [to],
      status: "failed",
      template: "approve-visitor",
    });
    return false;
  }
}

function generateApprovedBadgeEmail(visitor: any, currentDate: string, qrCodeUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif;background-color:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:20px;text-align:center;">
      <h1 style="margin:0;color:white;font-size:20px;">VisiGuard VMS</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:13px;">Visit Approved ✅</p>
    </div>
    <div style="padding:24px;">
      <h2 style="margin:0 0 16px;color:#1f2937;font-size:18px;">Dear ${visitor.name},</h2>
      
      <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #16a34a;">
        <p style="margin:0;color:#166534;font-size:16px;font-weight:bold;">🎉 Your visit has been APPROVED!</p>
      </div>

      <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0;">
        <table style="width:100%;font-size:14px;color:#374151;">
          <tr><td style="padding:4px 8px;font-weight:bold;">Name:</td><td style="padding:4px 8px;">${visitor.name}</td></tr>
          <tr><td style="padding:4px 8px;font-weight:bold;">Visitor ID:</td><td style="padding:4px 8px;">${visitor.visitor_id}</td></tr>
          ${visitor.company ? `<tr><td style="padding:4px 8px;font-weight:bold;">Company:</td><td style="padding:4px 8px;">${visitor.company}</td></tr>` : ""}
          ${visitor.purpose ? `<tr><td style="padding:4px 8px;font-weight:bold;">Purpose:</td><td style="padding:4px 8px;">${visitor.purpose}</td></tr>` : ""}
          ${visitor.host?.name ? `<tr><td style="padding:4px 8px;font-weight:bold;">Host:</td><td style="padding:4px 8px;">${visitor.host.name}</td></tr>` : ""}
          ${visitor.department?.name ? `<tr><td style="padding:4px 8px;font-weight:bold;">Department:</td><td style="padding:4px 8px;">${visitor.department.name}</td></tr>` : ""}
          ${visitor.gate?.name ? `<tr><td style="padding:4px 8px;font-weight:bold;">Entry Gate:</td><td style="padding:4px 8px;">${visitor.gate.name}</td></tr>` : ""}
          <tr><td style="padding:4px 8px;font-weight:bold;">Date:</td><td style="padding:4px 8px;">${currentDate}</td></tr>
        </table>
      </div>

      <div style="text-align:center;margin:24px 0;">
        <p style="color:#374151;font-size:14px;margin-bottom:12px;">Scan this QR code for quick check-out:</p>
        <img src="${qrCodeUrl}" alt="QR Code" style="width:200px;height:200px;border:2px solid #e5e7eb;border-radius:8px;" />
      </div>

      <div style="background:#fef3c7;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #f59e0b;text-align:center;">
        <p style="margin:0;color:#92400e;font-size:16px;font-weight:bold;">📱 Please show this email to the security guard at the entrance</p>
      </div>
    </div>
    <div style="background:#f8fafc;padding:16px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:11px;">This is an automated email from VisiGuard VMS. Please do not reply.</p>
    </div>
  </div>
</body>
</html>`;
}

const handler = async (req: Request): Promise<Response> => {
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
        JSON.stringify({ success: true, message: "Visitor rejected successfully", action: 'rejected' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Approve the visitor
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

    console.log(`Visitor ${visitorId} approved, sending notifications...`);

    // Notify gate security
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
        const { error: notifError } = await supabase.from('notifications').insert(notifications);
        if (notifError) {
          console.error("Error inserting gate security notifications:", notifError);
        } else {
          console.log(`Notified ${securityUsers.length} gate security user(s)`);
        }
      }
    }

    // QR code for badge
    const qrCodeData = encodeURIComponent(JSON.stringify({
      visitorId: visitor.id,
      name: visitor.name,
      action: 'checkout',
      timestamp: new Date().toISOString()
    }));
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrCodeData}&format=png`;

    const currentDate = new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let whatsappSent = false;
    let smsSent = false;
    let whatsappSid = null;
    let smsSid = null;

    // Send WhatsApp badge
    if (accountSid && authToken && twilioWhatsAppNumber && visitor.phone) {
      twilioWhatsAppNumber = twilioWhatsAppNumber.replace(/^whatsapp:/i, "").trim();
      let formattedPhone = visitor.phone.replace(/\s/g, "").replace(/-/g, "");
      if (!formattedPhone.startsWith("+")) {
        formattedPhone = "+91" + formattedPhone.replace(/^0/, "");
      }

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

    // Send SMS
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

    // ---- Email to visitor on approval ----
    let emailSent = false;
    if (visitor.email) {
      const emailHtml = generateApprovedBadgeEmail(visitor, currentDate, qrCodeUrl);
      emailSent = await sendSmtpEmail(
        supabase,
        visitor.email,
        `Visit Approved — Please Show This to Security`,
        emailHtml
      );
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
          smsSid,
          email: emailSent,
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
