import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.error("Missing RESEND_API_KEY");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(resendApiKey);

    const { 
      email,
      visitorName, 
      visitorId, 
      company, 
      purpose, 
      hostName, 
      departmentName,
      checkInTime,
      qrCodeUrl
    }: BadgeEmailRequest = await req.json();

    // Validate email
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email address is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending badge email to ${email} for visitor ${visitorName}`);

    const formattedDate = checkInTime 
      ? new Date(checkInTime).toLocaleDateString("en-IN", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : new Date().toLocaleDateString("en-IN", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

    const formattedTime = checkInTime
      ? new Date(checkInTime).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        });

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 400px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0891b2, #0e7490); padding: 20px; text-align: center;">
      <h1 style="margin: 0; color: white; font-size: 24px;">🎫 Visitor Badge</h1>
      <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">SAFETY PERMIT</p>
    </div>
    
    <!-- Badge Content -->
    <div style="padding: 24px;">
      
      <!-- Visitor Info -->
      <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <h2 style="margin: 0 0 12px; color: #1f2937; font-size: 20px;">${visitorName}</h2>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          <strong>ID:</strong> ${visitorId}
        </p>
      </div>
      
      <!-- Details -->
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        ${company ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 100px;">Company</td>
          <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${company}</td>
        </tr>` : ''}
        ${purpose ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 100px;">Purpose</td>
          <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${purpose}</td>
        </tr>` : ''}
        ${hostName ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 100px;">Host</td>
          <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${hostName}</td>
        </tr>` : ''}
        ${departmentName ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 100px;">Department</td>
          <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${departmentName}</td>
        </tr>` : ''}
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 100px;">Date</td>
          <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 100px;">Time</td>
          <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${formattedTime}</td>
        </tr>
      </table>
      
      <!-- QR Code -->
      ${qrCodeUrl ? `
      <div style="text-align: center; margin-top: 20px; padding: 16px; background: #f8fafc; border-radius: 8px;">
        <img src="${qrCodeUrl}" alt="QR Code" style="width: 150px; height: 150px; margin-bottom: 8px;">
        <p style="margin: 0; color: #6b7280; font-size: 12px;">Scan for quick check-out</p>
      </div>` : ''}
      
    </div>
    
    <!-- Footer -->
    <div style="background: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #6b7280; font-size: 12px;">
        Please show this badge at the security desk upon arrival.
      </p>
      <p style="margin: 8px 0 0; color: #9ca3af; font-size: 11px;">
        Powered by VisiGuard VMS
      </p>
    </div>
    
  </div>
</body>
</html>
    `;

    // Try sending to the actual recipient first
    let sendResult = await resend.emails.send({
      from: "VisiGuard <onboarding@resend.dev>",
      to: [email],
      subject: `Your Visitor Badge - ${visitorId}`,
      html: htmlContent,
    });

    // If domain not verified (sandbox mode), fall back to owner email
    if (sendResult.error && sendResult.error.message?.includes("testing emails to your own email")) {
      console.warn("Resend sandbox mode: redirecting email to owner address");
      const ownerEmail = "bala@sharviinfotech.com";
      sendResult = await resend.emails.send({
        from: "VisiGuard <onboarding@resend.dev>",
        to: [ownerEmail],
        subject: `[Test] Visitor Badge for ${visitorName} - ${visitorId}`,
        html: htmlContent,
      });

      if (sendResult.error) {
        console.error("Resend error:", sendResult.error);
        return new Response(
          JSON.stringify({ error: "Failed to send email", details: sendResult.error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("Badge email sent to owner (sandbox mode):", ownerEmail);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Badge sent to ${ownerEmail} (sandbox mode). To send to any email, verify your domain at resend.com/domains.`,
          sandbox: true
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (sendResult.error) {
      console.error("Resend error:", sendResult.error);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: sendResult.error.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Badge email sent successfully to:", email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Badge sent to email successfully" 
      }),
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
