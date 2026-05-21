import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BadgeEmailRequest {
  email: string;
  visitorName: string;
  visitorId: string;
  company?: string;
  purpose?: string;
  hostName?: string;
  departmentName?: string;
  checkInTime?: string;
  qrCodeUrl?: string;
}

// ---- Shared branded header / footer ----
const DEFAULT_LOGO_URL = "https://bzyvykyuiuihzvhdpxsi.supabase.co/storage/v1/object/public/branding/re-logo-mark.png";
const DEFAULT_COMPANY = "Re Sustainability";
const DEFAULT_PRIMARY = "#dc2626";

async function getBranding(supabase: any) {
  try {
    const { data } = await supabase
      .from("tenant_settings")
      .select("company_name, logo_url, primary_color")
      .limit(1)
      .maybeSingle();
    return {
      companyName: data?.company_name && data.company_name !== "Re Sustainability" ? data.company_name : DEFAULT_COMPANY,
      logoUrl: data?.logo_url || DEFAULT_LOGO_URL,
      primaryColor: data?.primary_color || DEFAULT_PRIMARY,
    };
  } catch {
    return { companyName: DEFAULT_COMPANY, logoUrl: DEFAULT_LOGO_URL, primaryColor: DEFAULT_PRIMARY };
  }
}

async function fetchLogoBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: smtp, error: smtpErr } = await supabase
      .from("email_config")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (smtpErr || !smtp) {
      console.error("No active SMTP configuration found");
      return new Response(
        JSON.stringify({ error: "Email service not configured. Configure SMTP in Settings → Email." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const branding = await getBranding(supabase);
    const logoBytes = await fetchLogoBytes(branding.logoUrl);

    const {
      email,
      visitorName,
      visitorId,
      company,
      purpose,
      hostName,
      departmentName,
      checkInTime,
      qrCodeUrl,
    }: BadgeEmailRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email address is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending badge email to ${email} for visitor ${visitorName}`);

    const formatDate = (d: Date) =>
      d.toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "Asia/Kolkata",
      });
    const formatTime = (d: Date) =>
      d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      });

    const dateObj = checkInTime ? new Date(checkInTime) : new Date();
    const formattedDate = formatDate(dateObj);
    const formattedTime = formatTime(dateObj);

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 400px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
    <div style="background:#ffffff;padding:12px 8px;border-bottom:1px solid #e5e7eb;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;min-width:320px;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
        <tr>
          <td width="88" style="width:88px;vertical-align:middle;padding:0 4px 0 8px;">
            <img src="cid:re-logo" alt="${branding.companyName}" width="80" height="80" style="display:block;width:80px;height:80px;object-fit:contain;background:#ffffff;border:0;outline:none;text-decoration:none;" />
          </td>
          <td style="vertical-align:middle;text-align:center;">
            <div style="font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:#dc2626;line-height:1.2;">${branding.companyName}</div>
            <div style="font-family:Arial,sans-serif;font-size:11px;color:#64748b;margin-top:4px;">🎫 Visitor Safety Permit</div>
          </td>
          <td width="88" style="width:88px;">&nbsp;</td>
        </tr>
      </table>
    </div>
    <div style="padding: 24px;">
      <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <h2 style="margin: 0 0 12px; color: #1f2937; font-size: 20px;">${visitorName}</h2>
        <p style="margin: 0; color: #6b7280; font-size: 14px;"><strong>ID:</strong> ${visitorId}</p>
      </div>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        ${company ? `<tr><td style="padding: 8px 0; color: #6b7280; width: 100px;">Company</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${company}</td></tr>` : ''}
        ${purpose ? `<tr><td style="padding: 8px 0; color: #6b7280; width: 100px;">Purpose</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${purpose}</td></tr>` : ''}
        ${hostName ? `<tr><td style="padding: 8px 0; color: #6b7280; width: 100px;">Host</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${hostName}</td></tr>` : ''}
        ${departmentName ? `<tr><td style="padding: 8px 0; color: #6b7280; width: 100px;">Department</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${departmentName}</td></tr>` : ''}
        <tr><td style="padding: 8px 0; color: #6b7280; width: 100px;">Date</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${formattedDate}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280; width: 100px;">Time</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${formattedTime}</td></tr>
      </table>
      ${qrCodeUrl ? `<div style="text-align: center; margin-top: 20px; padding: 16px; background: #f8fafc; border-radius: 8px;"><img src="${qrCodeUrl}" alt="QR Code" style="width: 150px; height: 150px; margin-bottom: 8px;"><p style="margin: 0; color: #6b7280; font-size: 12px;">Scan for quick check-out</p></div>` : ''}
    </div>
    <div style="background:#f8fafc;padding:14px 16px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#6b7280;font-size:12px;">Please show this badge at the security desk upon arrival.</p>
    </div>
  </div>
</body>
</html>`;

    const fromAddr = smtp.sender_name
      ? `"${smtp.sender_name}" <${smtp.sender_email}>`
      : smtp.sender_email;

    try {
      const transporter = nodemailer.createTransport({
        host: smtp.smtp_host,
        port: smtp.smtp_port,
        secure: smtp.smtp_port === 465,
        auth: { user: smtp.smtp_username, pass: smtp.smtp_password },
        tls: { rejectUnauthorized: false },
      });

      const info = await transporter.sendMail({
        from: fromAddr,
        to: [email],
        subject: `Your Visitor Badge - ${visitorId}`,
        html: htmlContent,
        attachments: logoBytes ? [{
          filename: 're-logo.png',
          content: logoBytes,
          contentType: 'image/png',
          cid: 're-logo',
          contentDisposition: 'inline',
          encoding: 'base64',
        }] : undefined,
      });

      console.log(`Badge email sent successfully to ${email} (id: ${info.messageId})`);
    } catch (sendErr: any) {
      console.error("SMTP send error:", sendErr?.message || sendErr);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: sendErr?.message || String(sendErr) }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Badge sent to email successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending email badge:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
