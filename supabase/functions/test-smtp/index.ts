import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SENDER = "VisiGuard <visitor@resustainability.com>";

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

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY is not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);

    console.log(`Sending test email via Resend from ${SENDER} to ${to_email}`);

    const result = await resend.emails.send({
      from: SENDER,
      to: [to_email],
      subject: "VisiGuard Email Test — Configuration Verified ✅",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0891b2, #0e7490); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="color: white; margin: 0;">✅ Email Sending Working!</h2>
          </div>
          <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p>This is a test email from <strong>VisiGuard VMS</strong> sent via Resend.</p>
            <p style="color: #6b7280; font-size: 14px;">
              Sender: ${SENDER}<br/>
              Provider: Resend
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">Sent at ${new Date().toISOString()}</p>
          </div>
        </div>
      `,
    });

    if (result.error) {
      console.error("Resend error:", result.error);
      const msg = result.error.message || "Failed to send test email";
      let hint = "";
      if (msg.toLowerCase().includes("domain") || msg.toLowerCase().includes("verify")) {
        hint = " The sending domain (resustainability.com) must be added and verified in resend.com → Domains. Ask the client's IT to publish the SPF/DKIM/DMARC DNS records shown in Resend's dashboard.";
      }
      return new Response(
        JSON.stringify({ error: msg + hint }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Test email sent successfully to ${to_email} (id: ${result.data?.id})`);

    return new Response(
      JSON.stringify({ success: true, message: `Test email sent successfully to ${to_email}`, id: result.data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Test email error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to send test email" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
