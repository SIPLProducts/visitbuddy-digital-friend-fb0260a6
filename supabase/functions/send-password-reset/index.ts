import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      companyName: data?.company_name || DEFAULT_COMPANY,
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

function buildHtml(resetUrl: string, branding: Branding): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif;background-color:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
    <div style="background:#ffffff;padding:12px 8px;border-bottom:1px solid #e5e7eb;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">
        <tr>
          <td width="96" style="width:96px;vertical-align:middle;padding:0 4px 0 8px;">
            <img src="cid:re-logo" alt="${branding.companyName}" width="80" height="80" style="display:block;width:80px;height:80px;object-fit:contain;background:#ffffff;border:0;" />
          </td>
          <td style="vertical-align:middle;text-align:center;">
            <div style="font-size:22px;font-weight:800;color:${branding.primaryColor};line-height:1.2;">${branding.companyName}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">Password Reset Request</div>
          </td>
          <td width="96" style="width:96px;">&nbsp;</td>
        </tr>
      </table>
    </div>
    <div style="padding:28px 24px;">
      <h2 style="margin:0 0 14px;color:#1f2937;font-size:18px;">Reset your password</h2>
      <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 18px;">
        We received a request to reset the password for your ${branding.companyName} VMS account.
        Click the button below to choose a new password. This link is valid for 1 hour and can only be used once.
      </p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${resetUrl}" style="display:inline-block;background:${branding.primaryColor};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">Reset Password</a>
      </p>
      <p style="color:#6b7280;font-size:12px;line-height:1.6;margin:18px 0 0;word-break:break-all;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${resetUrl}" style="color:${branding.primaryColor};">${resetUrl}</a>
      </p>
      <p style="color:#6b7280;font-size:12px;line-height:1.6;margin:18px 0 0;">
        If you didn't request a password reset, you can safely ignore this email — your password will not change.
      </p>
    </div>
    <div style="background:#f8fafc;padding:14px 16px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:11px;">This is an automated email. Please do not reply.</p>
    </div>
  </div>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = (body?.email || "").toString().trim().toLowerCase();
    const redirectTo = (body?.redirectTo || "").toString().trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Valid email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!redirectTo) {
      return new Response(JSON.stringify({ error: "redirectTo is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Generate the recovery link via admin API (does not send email)
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    // Don't leak which emails exist
    if (linkErr || !linkData?.properties?.action_link) {
      console.warn(`generateLink failed for ${email}:`, linkErr?.message);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resetUrl = linkData.properties.action_link;
    const branding = await getBranding(admin);
    const logoBytes = await fetchLogoBytes(branding.logoUrl);

    const { data: smtp } = await admin
      .from("email_config")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!smtp) {
      console.error("No active SMTP config in email_config");
      return new Response(
        JSON.stringify({ error: "Email service is not configured. Please contact your administrator." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtp.smtp_host,
      port: smtp.smtp_port,
      secure: smtp.smtp_port === 465,
      auth: { user: smtp.smtp_username, pass: smtp.smtp_password },
      tls: { rejectUnauthorized: false },
    });

    const fromAddr = smtp.sender_name
      ? `"${smtp.sender_name}" <${smtp.sender_email}>`
      : smtp.sender_email;

    const subject = `Reset your ${branding.companyName} VMS password`;
    const html = buildHtml(resetUrl, branding);

    try {
      const info = await transporter.sendMail({
        from: fromAddr,
        to: email,
        subject,
        html,
        attachments: logoBytes
          ? [{
              filename: "re-logo.png",
              content: logoBytes,
              contentType: "image/png",
              cid: "re-logo",
              contentDisposition: "inline",
              encoding: "base64",
            }]
          : undefined,
      });
      console.log(`Password reset sent to ${email} (id: ${info.messageId})`);
    } catch (sendErr: any) {
      console.error("SMTP send error:", sendErr?.message || sendErr);
    }

    try {
      await admin.from("email_logs").insert({
        subject,
        body: `Password reset link sent to ${email}`,
        recipients: [email],
        cc: [],
        template: "password_reset",
        status: "sent",
      });
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("send-password-reset error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Failed to send reset email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});