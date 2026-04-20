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

// ---- Shared branded header / footer ----
const DEFAULT_LOGO_URL = "https://bzyvykyuiuihzvhdpxsi.supabase.co/storage/v1/object/public/branding/re-logo-mark.png";
const DEFAULT_COMPANY = "Re Sustainability";
const DEFAULT_PRIMARY = "#dc2626";

interface Branding {
  companyName: string;
  logoUrl: string;
  primaryColor: string;
}

async function getBranding(supabase: any): Promise<Branding> {
  try {
    const { data } = await supabase
      .from("tenant_settings")
      .select("company_name, logo_url, primary_color")
      .limit(1)
      .maybeSingle();
    return {
      companyName: data?.company_name && data.company_name !== "VisiGuard" ? data.company_name : DEFAULT_COMPANY,
      logoUrl: data?.logo_url || DEFAULT_LOGO_URL,
      primaryColor: data?.primary_color || DEFAULT_PRIMARY,
    };
  } catch {
    return { companyName: DEFAULT_COMPANY, logoUrl: DEFAULT_LOGO_URL, primaryColor: DEFAULT_PRIMARY };
  }
}

function brandedHeader(b: Branding, subtitle: string): string {
  return `<div style="background:#ffffff;padding:12px 8px;border-bottom:1px solid #e5e7eb;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;min-width:320px;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
      <tr>
        <td width="96" style="width:96px;vertical-align:middle;padding:0 4px 0 8px;">
          <img src="cid:re-logo" alt="${b.companyName}" width="80" height="80" style="display:block;width:80px;height:80px;object-fit:contain;background:#ffffff;border:0;outline:none;text-decoration:none;" />
        </td>
        <td style="vertical-align:middle;text-align:center;">
          <div style="font-family:Arial,sans-serif;font-size:22px;font-weight:800;color:#dc2626;line-height:1.2;">${b.companyName}</div>
          <div style="font-family:Arial,sans-serif;font-size:12px;color:#64748b;margin-top:4px;">${subtitle}</div>
        </td>
        <td width="96" style="width:96px;">&nbsp;</td>
      </tr>
    </table>
  </div>`;
}

function brandedFooter(): string {
  return `<div style="background:#f8fafc;padding:14px 16px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:11px;font-family:Arial,sans-serif;">This is an automated email. Please do not reply.</p>
    </div>`;
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

function generateApprovedBadgeEmail(visitor: any, currentDate: string, qrCodeUrl: string, branding: Branding): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif;background-color:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
    ${brandedHeader(branding, "Visit Approved ✅")}
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
        <p style="color:#374151;font-size:14px;margin-bottom:12px;">Show this <strong>CHECK-IN</strong> QR code at the gate:</p>
        <img src="${qrCodeUrl}" alt="Check-in QR Code" style="width:200px;height:200px;border:2px solid #e5e7eb;border-radius:8px;" />
      </div>

      <div style="background:#fef3c7;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #f59e0b;text-align:center;">
        <p style="margin:0;color:#92400e;font-size:16px;font-weight:bold;">📱 Show this CHECK-IN QR to the security guard at the entrance</p>
      </div>
    </div>
    ${brandedFooter()}
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
    const branding = await getBranding(supabase);

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
      action: 'checkin',
      timestamp: new Date().toISOString()
    }));
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrCodeData}&format=png`;

    const currentDate = new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Kolkata",
    });

    let whatsappSent = false;
    let smsSent = false;
    let whatsappSid: string | null = null;
    let smsSid: string | null = null;
    let whatsappProvider: 'twilio' | 'whatsapp_web' = 'twilio';

    // Read provider preference from tenant_settings (defaults to twilio)
    try {
      const { data: ts } = await supabase
        .from('tenant_settings')
        .select('whatsapp_provider')
        .limit(1)
        .single();
      if (ts?.whatsapp_provider === 'whatsapp_web') whatsappProvider = 'whatsapp_web';
    } catch (e) {
      console.warn('Could not read whatsapp_provider, defaulting to twilio', e);
    }

    const buildWhatsAppMessage = () => {
      const lines: string[] = [
        `*${branding.companyName}*`,
        `_Visit Approved — Show This QR at the Gate_`,
        "━━━━━━━━━━━━━━━━━━━━",
        "",
        `Dear *${visitor.name}*,`,
        "",
        "✅ Your visit has been approved. Please show the *CHECK-IN QR* below to security at the gate.",
        "",
        "📋 *Details*",
        `• Visitor: ${visitor.name}`,
        `• ID: ${visitor.visitor_id}`,
      ];
      if (visitor.company) lines.push(`• Company: ${visitor.company}`);
      if (visitor.purpose) lines.push(`• Purpose: ${visitor.purpose}`);
      if (visitor.host?.name) lines.push(`• Host: ${visitor.host.name}`);
      if (visitor.department?.name) lines.push(`• Department: ${visitor.department.name}`);
      if (visitor.gate?.name) lines.push(`• Entry Gate: ${visitor.gate.name}`);
      lines.push(`• Date: ${currentDate}`);
      lines.push(
        "",
        "📱 *Show this CHECK-IN QR at the gate to be scanned in.*",
        "",
        "━━━━━━━━━━━━━━━━━━━━",
        "This is an automated message. Please do not reply.",
      );
      return lines.join("\n");
    };

    // ---- WhatsApp Web (DEMO) path via bridge ----
    if (whatsappProvider === 'whatsapp_web' && visitor.phone) {
      try {
        const bridgeUrl = Deno.env.get("WHATSAPP_BRIDGE_URL");
        const bridgeKey = Deno.env.get("WHATSAPP_BRIDGE_API_KEY");
        if (bridgeUrl && bridgeKey) {
          const resp = await fetch(`${bridgeUrl.replace(/\/+$/, '')}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': bridgeKey },
            body: JSON.stringify({
              phone: visitor.phone,
              message: buildWhatsAppMessage(),
              mediaUrl: qrCodeUrl,
            }),
          });
          const result = await resp.json().catch(() => ({}));
          if (resp.ok && result?.success) {
            whatsappSent = true;
            whatsappSid = result.id ?? 'wweb';
            console.log('WhatsApp Web (bridge) message sent', whatsappSid);
          } else {
            console.error('WhatsApp Web bridge failed, falling back to Twilio:', result);
          }
        } else {
          console.warn('whatsapp_web provider selected but bridge secrets are missing — falling back to Twilio');
        }
      } catch (bridgeErr) {
        console.error('WhatsApp Web bridge error, falling back to Twilio:', bridgeErr);
      }
    }

    // Send WhatsApp badge via Twilio (production path or fallback)
    if (!whatsappSent && accountSid && authToken && twilioWhatsAppNumber && visitor.phone) {
      twilioWhatsAppNumber = twilioWhatsAppNumber.replace(/^whatsapp:/i, "").trim();
      let formattedPhone = visitor.phone.replace(/\s/g, "").replace(/-/g, "");
      if (!formattedPhone.startsWith("+")) {
        formattedPhone = "+91" + formattedPhone.replace(/^0/, "");
      }

      const message = buildWhatsAppMessage();

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
          console.log("WhatsApp badge sent (twilio):", twilioResult.sid);
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

      const smsMessage = `${branding.companyName}: Your visit is APPROVED. ID: ${visitor.visitor_id}. Show the CHECK-IN QR (sent on WhatsApp/Email) at the gate. Host: ${visitor.host?.name || 'N/A'}.`;

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
      const emailHtml = generateApprovedBadgeEmail(visitor, currentDate, qrCodeUrl, branding);
      emailSent = await sendSmtpEmail(
        supabase,
        visitor.email,
        `Visit Approved — Show This QR at the Gate`,
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
