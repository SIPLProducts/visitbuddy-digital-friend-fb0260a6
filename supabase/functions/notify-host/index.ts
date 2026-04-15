import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyHostRequest {
  visitorId: string;
}

async function sendSmtpEmail(
  supabase: any,
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    const { data: smtp } = await supabase
      .from("email_config")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (!smtp) {
      console.warn("No active SMTP config found, skipping email");
      return false;
    }

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
      to,
      subject,
      html,
    });

    await supabase.from("email_logs").insert({
      subject,
      body: html,
      recipients: [to],
      status: "sent",
      template: "notify-host",
    });

    console.log(`Email sent to ${to}: ${subject}`);
    return true;
  } catch (err: any) {
    console.error(`Failed to send email to ${to}:`, err.message);
    await supabase.from("email_logs").insert({
      subject,
      body: html,
      recipients: [to],
      status: "failed",
      template: "notify-host",
    });
    return false;
  }
}

function generateHostApprovalEmail(
  visitor: any,
  hostName: string,
  gateName: string,
  departmentName: string,
  currentDate: string,
  currentTime: string,
  approveLink: string,
  rejectLink: string,
  accompanyingVisitors: any[] = []
): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif;background-color:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#0891b2,#0e7490);padding:20px;text-align:center;">
      <h1 style="margin:0;color:white;font-size:20px;">VisiGuard VMS</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:13px;">Visitor Approval Required</p>
    </div>
    <div style="padding:24px;">
      <h2 style="margin:0 0 16px;color:#1f2937;font-size:18px;">Dear ${hostName},</h2>
      <p style="color:#374151;font-size:14px;line-height:1.6;">A visitor is waiting for your approval. Please review the details below and take action.</p>
      
      <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #0891b2;">
        <table style="width:100%;font-size:14px;color:#374151;">
          <tr><td style="padding:4px 8px;font-weight:bold;">Visitor:</td><td style="padding:4px 8px;">${visitor.name}</td></tr>
          <tr><td style="padding:4px 8px;font-weight:bold;">ID:</td><td style="padding:4px 8px;">${visitor.visitor_id}</td></tr>
          ${visitor.company ? `<tr><td style="padding:4px 8px;font-weight:bold;">Company:</td><td style="padding:4px 8px;">${visitor.company}</td></tr>` : ""}
          ${visitor.purpose ? `<tr><td style="padding:4px 8px;font-weight:bold;">Purpose:</td><td style="padding:4px 8px;">${visitor.purpose}</td></tr>` : ""}
          ${visitor.phone ? `<tr><td style="padding:4px 8px;font-weight:bold;">Phone:</td><td style="padding:4px 8px;">${visitor.phone}</td></tr>` : ""}
          ${departmentName ? `<tr><td style="padding:4px 8px;font-weight:bold;">Department:</td><td style="padding:4px 8px;">${departmentName}</td></tr>` : ""}
          ${gateName ? `<tr><td style="padding:4px 8px;font-weight:bold;">Entry Gate:</td><td style="padding:4px 8px;">${gateName}</td></tr>` : ""}
          <tr><td style="padding:4px 8px;font-weight:bold;">Date:</td><td style="padding:4px 8px;">${currentDate}</td></tr>
          <tr><td style="padding:4px 8px;font-weight:bold;">Time:</td><td style="padding:4px 8px;">${currentTime}</td></tr>
        </table>
      </div>

      ${accompanyingVisitors.length > 0 ? `
      <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #16a34a;">
        <h3 style="margin:0 0 12px;color:#166534;font-size:15px;">👥 Accompanying Persons (${accompanyingVisitors.length})</h3>
        <table style="width:100%;font-size:13px;color:#374151;border-collapse:collapse;">
          <tr style="background:#dcfce7;">
            <th style="padding:6px 8px;text-align:left;border-bottom:1px solid #bbf7d0;">#</th>
            <th style="padding:6px 8px;text-align:left;border-bottom:1px solid #bbf7d0;">Name</th>
            <th style="padding:6px 8px;text-align:left;border-bottom:1px solid #bbf7d0;">Phone</th>
            <th style="padding:6px 8px;text-align:left;border-bottom:1px solid #bbf7d0;">Devices</th>
          </tr>
          ${accompanyingVisitors.map((av: any, i: number) => {
            const devices: string[] = [];
            if (av.has_laptop) devices.push(`💻 ${av.laptop_brand || 'Laptop'}${av.laptop_serial ? ` (${av.laptop_serial})` : ''}`);
            if (av.has_mobile) devices.push(`📱 ${av.mobile_brand || 'Mobile'}${av.mobile_serial ? ` (${av.mobile_serial})` : ''}`);
            return `<tr>
              <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${i + 1}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${av.name}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${av.phone || '-'}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${devices.length > 0 ? devices.join(', ') : 'None'}</td>
            </tr>`;
          }).join('')}
        </table>
      </div>
      ` : ''}

      <div style="text-align:center;margin:24px 0;">
        <a href="${approveLink}" style="display:inline-block;background:#16a34a;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;margin:0 8px;">✅ Approve Visit</a>
        <a href="${rejectLink}" style="display:inline-block;background:#dc2626;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;margin:0 8px;">❌ Reject Visit</a>
      </div>
    </div>
    <div style="background:#f8fafc;padding:16px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:11px;">This is an automated email from VisiGuard VMS. Please do not reply.</p>
    </div>
    <div style="background:#1e293b;padding:16px;text-align:center;">
      <p style="margin:0;color:#f1f5f9;font-size:12px;">🚀 Built with excellence by <strong>Sharvi Info Tech Pvt. Ltd.</strong></p>
      <p style="margin:6px 0;"><a href="https://www.sharviinfotech.com/" style="color:#38bdf8;font-size:11px;text-decoration:none;">🌐 www.sharviinfotech.com</a></p>
      <p style="margin:0;color:#94a3b8;font-size:11px;font-style:italic;">Transforming ideas into powerful digital solutions.</p>
    </div>
  </div>
</body>
</html>`;
}

function generateVisitorConfirmationEmail(
  visitorName: string,
  visitorId: string,
  hostName: string,
  departmentName: string,
  gateName: string,
  currentDate: string,
  currentTime: string,
  purpose?: string
): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif;background-color:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#0891b2,#0e7490);padding:20px;text-align:center;">
      <h1 style="margin:0;color:white;font-size:20px;">VisiGuard VMS</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:13px;">Visit Request Submitted</p>
    </div>
    <div style="padding:24px;">
      <h2 style="margin:0 0 16px;color:#1f2937;font-size:18px;">Dear ${visitorName},</h2>
      <p style="color:#374151;font-size:14px;line-height:1.6;">Your visit request has been submitted and is now pending approval from your host.</p>
      
      <div style="background:#fefce8;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #eab308;">
        <p style="margin:0;color:#854d0e;font-size:14px;font-weight:bold;">⏳ Status: Awaiting Host Approval</p>
      </div>

      <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0;">
        <table style="width:100%;font-size:14px;color:#374151;">
          <tr><td style="padding:4px 8px;font-weight:bold;">Visitor ID:</td><td style="padding:4px 8px;">${visitorId}</td></tr>
          ${purpose ? `<tr><td style="padding:4px 8px;font-weight:bold;">Purpose:</td><td style="padding:4px 8px;">${purpose}</td></tr>` : ""}
          <tr><td style="padding:4px 8px;font-weight:bold;">Host:</td><td style="padding:4px 8px;">${hostName}</td></tr>
          ${departmentName ? `<tr><td style="padding:4px 8px;font-weight:bold;">Department:</td><td style="padding:4px 8px;">${departmentName}</td></tr>` : ""}
          ${gateName ? `<tr><td style="padding:4px 8px;font-weight:bold;">Entry Gate:</td><td style="padding:4px 8px;">${gateName}</td></tr>` : ""}
          <tr><td style="padding:4px 8px;font-weight:bold;">Date:</td><td style="padding:4px 8px;">${currentDate}</td></tr>
          <tr><td style="padding:4px 8px;font-weight:bold;">Time:</td><td style="padding:4px 8px;">${currentTime}</td></tr>
        </table>
      </div>

      <p style="color:#374151;font-size:14px;line-height:1.6;">You will receive another email once your visit has been approved. Please wait for confirmation before proceeding to the facility.</p>
    </div>
    <div style="background:#f8fafc;padding:16px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:11px;">This is an automated email from VisiGuard VMS. Please do not reply.</p>
    </div>
    <div style="background:#1e293b;padding:16px;text-align:center;">
      <p style="margin:0;color:#f1f5f9;font-size:12px;">🚀 Built with excellence by <strong>Sharvi Info Tech Pvt. Ltd.</strong></p>
      <p style="margin:6px 0;"><a href="https://www.sharviinfotech.com/" style="color:#38bdf8;font-size:11px;text-decoration:none;">🌐 www.sharviinfotech.com</a></p>
      <p style="margin:0;color:#94a3b8;font-size:11px;font-style:italic;">Transforming ideas into powerful digital solutions.</p>
    </div>
  </div>
</body>
</html>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    let twilioWhatsAppNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const publicUrl = Deno.env.get("PUBLIC_URL") || "https://visitbuddy-digital-friend.lovable.app";

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      return new Response(
        JSON.stringify({ error: "Database service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { visitorId }: NotifyHostRequest = await req.json();

    if (!visitorId) {
      return new Response(
        JSON.stringify({ error: "Visitor ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Fetching visitor details for ID: ${visitorId}`);

    // Fetch visitor details - added email field
    const { data: visitor, error: visitorError } = await supabase
      .from("visitors")
      .select("id, visitor_id, name, phone, email, company, purpose, photo_url, host_id, department_id, gate_id, status")
      .eq("id", visitorId)
      .single();

    const isPendingApproval = visitor?.status === 'pending_approval';

    if (visitorError || !visitor) {
      console.error("Failed to fetch visitor:", visitorError);
      return new Response(
        JSON.stringify({ error: "Visitor not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Visitor data:", JSON.stringify(visitor));

    if (!visitor.host_id) {
      console.log("No host assigned to this visitor");
      return new Response(
        JSON.stringify({ success: true, message: "No host assigned, notification skipped" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: hostData, error: hostError } = await supabase
      .from("employees")
      .select("id, name, email, phone")
      .eq("id", visitor.host_id)
      .single();

    if (hostError || !hostData) {
      console.error("Failed to fetch host details:", hostError);
      return new Response(
        JSON.stringify({ error: "Host not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let gateName = "";
    if (visitor.gate_id) {
      const { data: gateData } = await supabase
        .from("gates")
        .select("name")
        .eq("id", visitor.gate_id)
        .single();
      gateName = gateData?.name || "";
    }

    let departmentName = "";
    if (visitor.department_id) {
      const { data: deptData } = await supabase
        .from("departments")
        .select("name")
        .eq("id", visitor.department_id)
        .single();
      departmentName = deptData?.name || "";
    }

    console.log(`Host ${hostData.name} (${hostData.email}, ${hostData.phone}) should be notified about visitor ${visitor.name}`);

    // Fetch accompanying visitors
    const { data: accompanyingVisitors } = await supabase
      .from("accompanying_visitors")
      .select("name, phone, has_laptop, laptop_brand, laptop_serial, has_mobile, mobile_brand, mobile_serial")
      .eq("visitor_id", visitor.id);
    
    const companions = accompanyingVisitors || [];
    console.log(`Found ${companions.length} accompanying visitors`);

    const currentDate = new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Kolkata",
    });

    const currentTime = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    });

    // ---- WhatsApp notifications (existing logic) ----
    const twilioUrl = accountSid ? `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json` : null;
    let hostNotificationSent = false;
    let hostMessageSid = "";
    let visitorNotificationSent = false;

    if (accountSid && authToken && twilioWhatsAppNumber && hostData.phone) {
      twilioWhatsAppNumber = twilioWhatsAppNumber.replace(/^whatsapp:/i, "").trim();

      let formattedHostPhone = hostData.phone.replace(/\s/g, "").replace(/-/g, "");
      if (!formattedHostPhone.startsWith("+")) {
        formattedHostPhone = "+91" + formattedHostPhone.replace(/^0/, "");
      }

      const approveLink = isPendingApproval
        ? `${publicUrl}/approve-visitor?id=${visitor.id}&action=approve`
        : null;
      const rejectLink = isPendingApproval
        ? `${publicUrl}/approve-visitor?id=${visitor.id}&action=reject`
        : null;

      const hostMessage = isPendingApproval
        ? `
🔔 *Visitor Approval Request*
━━━━━━━━━━━━━━━━━━━━

Dear *${hostData.name}*,

A visitor is waiting for your approval:

👤 *Visitor:* ${visitor.name}
🆔 *ID:* ${visitor.visitor_id}
${visitor.phone ? `📱 *Mobile:* ${visitor.phone}` : ""}
${visitor.company ? `🏢 *Company:* ${visitor.company}` : ""}
${visitor.purpose ? `📋 *Purpose:* ${visitor.purpose}` : ""}
${gateName ? `🚪 *Entry Point:* ${gateName}` : ""}
${companions.length > 0 ? `
👥 *Accompanying Persons (${companions.length}):*
${companions.map((c: any, i: number) => `  ${i + 1}. ${c.name}${c.phone ? ` (${c.phone})` : ''}`).join('\n')}` : ""}

📅 *Date:* ${currentDate}
⏰ *Time:* ${currentTime}

━━━━━━━━━━━━━━━━━━━━
✅ *Approve:* ${approveLink}
❌ *Reject:* ${rejectLink}

_VisiGuard Visitor Management System_
        `.trim()
        : `
🔔 *Visitor Arrival Notification*
━━━━━━━━━━━━━━━━━━━━

Dear *${hostData.name}*,

A visitor has checked in to meet you:

👤 *Visitor:* ${visitor.name}
🆔 *ID:* ${visitor.visitor_id}
${visitor.phone ? `📱 *Mobile:* ${visitor.phone}` : ""}
${visitor.company ? `🏢 *Company:* ${visitor.company}` : ""}
${visitor.purpose ? `📋 *Purpose:* ${visitor.purpose}` : ""}
${gateName ? `🚪 *Entry Point:* ${gateName}` : ""}

📅 *Date:* ${currentDate}
⏰ *Time:* ${currentTime}

━━━━━━━━━━━━━━━━━━━━
Please proceed to the reception to receive your visitor.

_VisiGuard Visitor Management System_
        `.trim();

      const hostFormData = new URLSearchParams();
      hostFormData.append("To", `whatsapp:${formattedHostPhone}`);
      hostFormData.append("From", `whatsapp:${twilioWhatsAppNumber}`);
      hostFormData.append("Body", hostMessage);
      if (visitor.photo_url) {
        hostFormData.append("MediaUrl", visitor.photo_url);
      }

      try {
        const twilioResponse = await fetch(twilioUrl!, {
          method: "POST",
          headers: {
            "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: hostFormData,
        });
        const twilioResult = await twilioResponse.json();
        if (twilioResponse.ok) {
          console.log("Host notification sent successfully:", twilioResult.sid);
          hostNotificationSent = true;
          hostMessageSid = twilioResult.sid;
        } else {
          console.error("Failed to send host notification:", twilioResult);
        }
      } catch (whatsappError) {
        console.error("WhatsApp send error to host:", whatsappError);
      }
    } else {
      console.log("Twilio not configured or host has no phone, skipping WhatsApp to host");
    }

    // WhatsApp confirmation to visitor
    if (accountSid && authToken && twilioWhatsAppNumber && visitor.phone) {
      let formattedVisitorPhone = visitor.phone.replace(/\s/g, "").replace(/-/g, "");
      if (!formattedVisitorPhone.startsWith("+")) {
        formattedVisitorPhone = "+91" + formattedVisitorPhone.replace(/^0/, "");
      }

      const visitorMessage = `
✅ *Check-in Confirmed*
━━━━━━━━━━━━━━━━━━━━

Dear *${visitor.name}*,

Your check-in has been recorded successfully!

🆔 *Visitor ID:* ${visitor.visitor_id}
${hostData.name ? `👤 *Host:* ${hostData.name}` : ""}
${departmentName ? `🏢 *Department:* ${departmentName}` : ""}
${gateName ? `🚪 *Entry Gate:* ${gateName}` : ""}

📅 *Date:* ${currentDate}
⏰ *Time:* ${currentTime}

${hostNotificationSent ? "Your host has been notified of your arrival." : "Please wait at the reception area."}

_VisiGuard Visitor Management System_
      `.trim();

      const visitorFormData = new URLSearchParams();
      visitorFormData.append("To", `whatsapp:${formattedVisitorPhone}`);
      visitorFormData.append("From", `whatsapp:${twilioWhatsAppNumber}`);
      visitorFormData.append("Body", visitorMessage);

      try {
        const twilioResponse = await fetch(twilioUrl!, {
          method: "POST",
          headers: {
            "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: visitorFormData,
        });
        const twilioResult = await twilioResponse.json();
        if (twilioResponse.ok) {
          console.log("Visitor confirmation sent:", twilioResult.sid);
          visitorNotificationSent = true;
        } else {
          console.error("Failed to send visitor confirmation:", twilioResult);
        }
      } catch (whatsappError) {
        console.error("WhatsApp send error to visitor:", whatsappError);
      }
    }

    // ---- Email notifications ----
    let hostEmailSent = false;
    let visitorEmailSent = false;

    // Email to host (if host has email and visitor is pending approval)
    if (hostData.email && isPendingApproval) {
      const approveLink = `${publicUrl}/approve-visitor?id=${visitor.id}&action=approve`;
      const rejectLink = `${publicUrl}/approve-visitor?id=${visitor.id}&action=reject`;
      const hostEmailHtml = generateHostApprovalEmail(
        visitor, hostData.name, gateName, departmentName,
        currentDate, currentTime, approveLink, rejectLink, companions
      );
      hostEmailSent = await sendSmtpEmail(
        supabase, hostData.email,
        `Visitor Approval Required — ${visitor.name}`,
        hostEmailHtml
      );
    } else if (hostData.email && !isPendingApproval) {
      // For direct check-in, still notify host via email
      const hostEmailHtml = generateHostApprovalEmail(
        visitor, hostData.name, gateName, departmentName,
        currentDate, currentTime, "", "", companions
      ).replace(/Visitor Approval Required/g, "Visitor Arrival Notification")
       .replace(/<div style="text-align:center;margin:24px 0;">[\s\S]*?<\/div>/,
        '<p style="text-align:center;color:#374151;font-size:14px;">Please proceed to the reception to receive your visitor.</p>');
      hostEmailSent = await sendSmtpEmail(
        supabase, hostData.email,
        `Visitor Arrival — ${visitor.name}`,
        hostEmailHtml
      );
    }

    // Email to visitor (if visitor has email)
    if (visitor.email && isPendingApproval) {
      const visitorEmailHtml = generateVisitorConfirmationEmail(
        visitor.name, visitor.visitor_id, hostData.name,
        departmentName, gateName, currentDate, currentTime, visitor.purpose
      );
      visitorEmailSent = await sendSmtpEmail(
        supabase, visitor.email,
        "Visit Request Submitted — Awaiting Approval",
        visitorEmailHtml
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notifications processed",
        hostNotified: hostNotificationSent,
        hostMessageSid: hostMessageSid || null,
        visitorNotified: visitorNotificationSent,
        hostEmailSent,
        visitorEmailSent,
        visitor: { id: visitor.visitor_id, name: visitor.name },
        host: {
          name: hostData.name,
          email: hostData.email,
          phone: hostData.phone ? "***" + hostData.phone.slice(-4) : null,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error notifying host:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
