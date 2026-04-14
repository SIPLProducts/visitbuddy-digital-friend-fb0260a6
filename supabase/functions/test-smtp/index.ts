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
    const { smtp_config_id, to_email } = await req.json();

    if (!smtp_config_id || !to_email) {
      return new Response(
        JSON.stringify({ error: "smtp_config_id and to_email are required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: config, error } = await supabase
      .from("email_config")
      .select("*")
      .eq("id", smtp_config_id)
      .single();

    if (error || !config) {
      return new Response(
        JSON.stringify({ error: "SMTP configuration not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Testing SMTP: ${config.smtp_host}:${config.smtp_port} as ${config.smtp_username}`);

    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_port === 465,
      auth: {
        user: config.smtp_username,
        pass: config.smtp_password,
      },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: config.sender_name
        ? `"${config.sender_name}" <${config.sender_email}>`
        : config.sender_email,
      to: to_email,
      subject: "SMTP Test — Configuration Verified ✅",
      text: `This is a test email from VisiGuard VMS.\n\nSMTP Host: ${config.smtp_host}\nPort: ${config.smtp_port}\n\nIf you received this, your SMTP configuration is working correctly.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0891b2, #0e7490); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="color: white; margin: 0;">✅ SMTP Configuration Working!</h2>
          </div>
          <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p>This is a test email from <strong>VisiGuard VMS</strong> to verify your SMTP configuration.</p>
            <p style="color: #6b7280; font-size: 14px;">
              SMTP Host: ${config.smtp_host}<br/>
              Port: ${config.smtp_port}<br/>
              TLS: ${config.use_tls ? 'Enabled' : 'Disabled'}
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">Sent at ${new Date().toISOString()}</p>
          </div>
        </div>
      `,
    });

    console.log(`Test email sent successfully to ${to_email}`);

    return new Response(
      JSON.stringify({ success: true, message: `Test email sent successfully to ${to_email}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("SMTP test error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to send test email" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
