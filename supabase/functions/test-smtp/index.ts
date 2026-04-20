import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to_email } = await req.json();

    if (!to_email) {
      return new Response(
        JSON.stringify({ error: "to_email is required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      return new Response(
        JSON.stringify({ error: "No active SMTP configuration found. Configure SMTP in Settings → Email and save it first." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fromAddr = smtp.sender_name
      ? `"${smtp.sender_name}" <${smtp.sender_email}>`
      : smtp.sender_email;

    console.log(`Sending test email via SMTP (${smtp.smtp_host}:${smtp.smtp_port}) from ${fromAddr} to ${to_email}`);

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
        to: [to_email],
        subject: "VisiGuard Email Test — Configuration Verified ✅",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #0891b2, #0e7490); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h2 style="color: white; margin: 0;">✅ Email Sending Working!</h2>
            </div>
            <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <p>This is a test email from <strong>VisiGuard VMS</strong> sent via SMTP.</p>
              <p style="color: #6b7280; font-size: 14px;">
                Sender: ${fromAddr}<br/>
                Provider: SMTP (${smtp.smtp_host}:${smtp.smtp_port})
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">Sent at ${new Date().toISOString()}</p>
            </div>
          </div>
        `,
      });

      console.log(`Test email sent successfully to ${to_email} (id: ${info.messageId})`);

      return new Response(
        JSON.stringify({ success: true, message: `Test email sent successfully to ${to_email}`, id: info.messageId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (sendErr: any) {
      const msg = sendErr?.message || "Failed to send test email";
      console.error("SMTP send error:", msg);
      let hint = "";
      const lower = msg.toLowerCase();
      if (lower.includes("invalid login") || lower.includes("authentication") || lower.includes("535")) {
        hint = " For Gmail, ensure you are using a 16-character App Password (not your regular password). Enable 2-Step Verification on the Google Account, then generate an App Password at myaccount.google.com → Security → App passwords.";
      }
      return new Response(
        JSON.stringify({ error: msg + hint }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err: any) {
    console.error("Test email error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to send test email" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
