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
    <div style="background: linear-gradient(135deg, #0891b2, #0e7490); padding: 20px; text-align: center;">
      <h1 style="margin: 0; color: white; font-size: 24px;">🎫 Visitor Badge</h1>
      <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">SAFETY PERMIT</p>
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
    <div style="background: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #6b7280; font-size: 12px;">Please show this badge at the security desk upon arrival.</p>
      <p style="margin: 8px 0 0; color: #9ca3af; font-size: 11px;">Powered by VisiGuard VMS</p>
    </div>
    <div style="background:#1e293b;padding:16px;text-align:center;">
      <p style="margin:0;color:#f1f5f9;font-size:12px;">🚀 Built with excellence by <strong>Sharvi Info Tech Pvt. Ltd.</strong></p>
      <p style="margin:6px 0;"><a href="https://www.sharviinfotech.com/" style="color:#38bdf8;font-size:11px;text-decoration:none;">🌐 www.sharviinfotech.com</a></p>
      <p style="margin:0;color:#94a3b8;font-size:11px;font-style:italic;">Transforming ideas into powerful digital solutions.</p>
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
