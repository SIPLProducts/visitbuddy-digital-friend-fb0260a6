import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { receiver_email } = await req.json();

    if (!receiver_email || typeof receiver_email !== "string" || !receiver_email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Valid receiver email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: config, error: configError } = await supabase
      .from("email_config")
      .select("*")
      .limit(1)
      .single();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: "No email configuration found. Please save your SMTP settings first." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Testing SMTP: ${config.smtp_host}:${config.smtp_port} as ${config.smtp_username}`);

    const client = new SMTPClient({
      connection: {
        hostname: config.smtp_host,
        port: config.smtp_port,
        tls: config.use_tls,
        auth: {
          username: config.smtp_username,
          password: config.smtp_password,
        },
      },
    });

    await client.send({
      from: config.sender_name
        ? `${config.sender_name} <${config.sender_email}>`
        : config.sender_email,
      to: receiver_email,
      subject: "Test Email - VisiGuard Email Configuration",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0891b2, #0e7490); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="color: white; margin: 0;">✅ Email Configuration Working!</h2>
          </div>
          <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p>This is a test email from <strong>VisiGuard VMS</strong> to verify your SMTP configuration.</p>
            <p style="color: #6b7280; font-size: 14px;">
              SMTP Host: ${config.smtp_host}<br/>
              Port: ${config.smtp_port}<br/>
              TLS: ${config.use_tls ? 'Enabled' : 'Disabled'}
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
              Sent at ${new Date().toISOString()}
            </p>
          </div>
        </div>
      `,
    });

    await client.close();

    console.log(`Test email sent successfully to ${receiver_email}`);

    return new Response(
      JSON.stringify({ success: true, message: `Test email sent to ${receiver_email}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Test email error:", error);
    return new Response(
      JSON.stringify({ error: `Failed to send test email: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
