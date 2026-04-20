import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_LOGO_URL = "https://bzyvykyuiuihzvhdpxsi.supabase.co/storage/v1/object/public/branding/resl-logo.png";
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

function generateHtmlEmail(subject: string, body: string, branding: Branding): string {
  const bodyHtml = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif;background-color:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
    <div style="background:#ffffff;padding:18px 24px;border-bottom:1px solid #e5e7eb;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="width:64px;vertical-align:middle;padding-right:14px;">
            <img src="${branding.logoUrl}" alt="${branding.companyName}" width="56" height="56" style="display:block;width:56px;height:56px;object-fit:contain;background:#ffffff;border-radius:6px;" />
          </td>
          <td style="vertical-align:middle;">
            <div style="font-family:Arial,sans-serif;font-size:18px;font-weight:700;color:#0f172a;line-height:1.2;">${branding.companyName}</div>
            <div style="font-family:Arial,sans-serif;font-size:12px;color:#475569;margin-top:4px;border-top:2px solid ${branding.primaryColor};display:inline-block;padding-top:4px;">Automated Notification</div>
          </td>
        </tr>
      </table>
    </div>
    <div style="padding:24px;">
      <h2 style="margin:0 0 16px;color:#1f2937;font-size:18px;">${subject}</h2>
      <div style="color:#374151;font-size:14px;line-height:1.6;"><p>${bodyHtml}</p></div>
    </div>
    <div style="background:#f8fafc;padding:14px 16px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:11px;font-family:Arial,sans-serif;">This is an automated email. Please do not reply.</p>
    </div>
    <div style="background:#f1f5f9;padding:14px 16px;text-align:center;">
      <p style="margin:0;color:#475569;font-size:12px;font-family:Arial,sans-serif;">Powered by <strong style="color:#0f172a;">Sharvi Infotech</strong></p>
      <p style="margin:4px 0 0;"><a href="https://www.sharviinfotech.com/" style="color:#0ea5e9;font-size:11px;text-decoration:none;font-family:Arial,sans-serif;">www.sharviinfotech.com</a></p>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { template_key, variables } = await req.json();
    const branding = await getBranding(supabase);

    if (!template_key) {
      return new Response(
        JSON.stringify({ error: "template_key is required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch template
    const { data: template, error: tplErr } = await supabase
      .from("email_templates")
      .select("*")
      .eq("template_key", template_key)
      .eq("is_active", true)
      .single();

    if (tplErr || !template) {
      return new Response(
        JSON.stringify({ error: `Template '${template_key}' not found` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Replace {{placeholders}}
    const replacePlaceholders = (text: string) =>
      text.replace(/\{\{(\w+)\}\}/g, (_, key) => (variables && variables[key]) ?? "N/A");

    const subject = replacePlaceholders(template.subject_template);
    const body = replacePlaceholders(template.body_template);
    const toEmails = (template.to_emails || []).filter(
      (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())
    );
    const ccEmails = (template.cc_emails || []).filter(
      (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())
    );

    let status = "logged";

    if (toEmails.length === 0) {
      console.warn(`Email logged (no recipients) for template '${template_key}'`);
    } else {
      // Fetch active SMTP config
      const { data: smtp, error: smtpErr } = await supabase
        .from("email_config")
        .select("*")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (smtpErr || !smtp) {
        console.warn(`No active SMTP config — email logged for template '${template_key}'`);
      } else {
        try {
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

          const info = await transporter.sendMail({
            from: fromAddr,
            to: toEmails,
            cc: ccEmails.length ? ccEmails : undefined,
            subject,
            html: generateHtmlEmail(subject, body, branding),
          });

          status = "sent";
          console.log(`Email sent via SMTP for template '${template_key}' to ${toEmails.join(", ")} (id: ${info.messageId})`);
        } catch (sendErr: any) {
          console.error(`SMTP send error for template '${template_key}':`, sendErr?.message || sendErr);
          status = "failed";
        }
      }
    }

    // 4. Log it
    await supabase.from("email_logs").insert({
      subject,
      body,
      recipients: toEmails,
      cc: template.cc_emails,
      template: template_key,
      status,
    });

    return new Response(
      JSON.stringify({ success: status !== "failed", status }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Send email error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send email" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
