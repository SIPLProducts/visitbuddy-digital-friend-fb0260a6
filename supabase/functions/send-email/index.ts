import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateHtmlEmail(subject: string, body: string): string {
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
    <div style="background:linear-gradient(135deg,#0891b2,#0e7490);padding:20px;text-align:center;">
      <h1 style="margin:0;color:white;font-size:20px;">VisiGuard VMS</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:13px;">Automated Notification</p>
    </div>
    <div style="padding:24px;">
      <h2 style="margin:0 0 16px;color:#1f2937;font-size:18px;">${subject}</h2>
      <div style="color:#374151;font-size:14px;line-height:1.6;"><p>${bodyHtml}</p></div>
    </div>
    <div style="background:#f8fafc;padding:16px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:11px;">This is an automated email. Please do not reply.</p>
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

    // 3. Fetch active SMTP config
    const { data: smtp } = await supabase
      .from("email_config")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .single();

    let status = "logged";

    if (smtp && toEmails.length > 0) {
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
        to: toEmails,
        cc: template.cc_emails?.length ? template.cc_emails : undefined,
        subject,
        html: generateHtmlEmail(subject, body),
      });
      status = "sent";
      console.log(`Email sent via template '${template_key}' to ${toEmails.join(", ")}`);
    } else {
      console.warn(`Email logged (no SMTP config or no recipients) for template '${template_key}'`);
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
      JSON.stringify({ success: true, status }),
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
