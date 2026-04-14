import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY is not configured. Please configure it in your backend secrets." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: config } = await supabase
      .from("email_config")
      .select("*")
      .limit(1)
      .single();

    const smtpInfo = config
      ? `SMTP Host: ${config.smtp_host}<br/>Port: ${config.smtp_port}<br/>TLS: ${config.use_tls ? 'Enabled' : 'Disabled'}`
      : "No SMTP config saved yet";

    console.log(`Sending test email to ${receiver_email} via Resend API`);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "VisiGuard VMS <onboarding@resend.dev>",
        to: [receiver_email],
        subject: "Test Email - VisiGuard Email Configuration",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #0891b2, #0e7490); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h2 style="color: white; margin: 0;">✅ Email Configuration Working!</h2>
            </div>
            <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <p>This is a test email from <strong>VisiGuard VMS</strong> to verify your email configuration.</p>
              <p style="color: #6b7280; font-size: 14px;">${smtpInfo}</p>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">Sent at ${new Date().toISOString()}</p>
            </div>
          </div>
        `,
      }),
    });

    const resendData = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", JSON.stringify(resendData));

      // Handle sandbox restriction specifically
      if (response.status === 403 && resendData.message?.includes("only send testing emails")) {
        return new Response(
          JSON.stringify({
            error: `Sandbox restriction: Test emails can currently only be sent to the verified owner email (bala@sharviinfotech.com). To send to any recipient, a sending domain must be verified. Please try again with bala@sharviinfotech.com as the recipient.`,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: `Email sending failed: ${resendData.message || JSON.stringify(resendData)}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Test email sent successfully to ${receiver_email}`);

    return new Response(
      JSON.stringify({ success: true, message: `Test email sent successfully to ${receiver_email}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Test email error:", error);
    return new Response(
      JSON.stringify({ error: `Failed to send test email: ${error.message}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
