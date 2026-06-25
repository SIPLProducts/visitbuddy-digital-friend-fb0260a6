import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyHostRequest {
  visitorId: string;
  force?: boolean;
}

// Resolve the public-facing app URL used in approval links.
// Priority: request Origin -> request Referer origin -> tenant_settings.public_app_url
// -> PUBLIC_URL env -> null (caller decides what to do).
async function resolvePublicUrl(req: Request, supabase: any): Promise<string | null> {
  const fromHeader = (h: string | null): string | null => {
    if (!h) return null;
    try {
      const u = new URL(h);
      // Ignore the supabase functions host itself (would point to the API, not the app).
      if (/\.functions\.supabase\.co$/i.test(u.hostname)) return null;
      return `${u.protocol}//${u.host}`;
    } catch { return null; }
  };
  const origin = fromHeader(req.headers.get("origin")) || fromHeader(req.headers.get("referer"));
  if (origin) return origin.replace(/\/+$/, "");
  try {
    const { data } = await supabase
      .from("tenant_settings")
      .select("public_app_url")
      .limit(1)
      .maybeSingle();
    if (data?.public_app_url) return String(data.public_app_url).replace(/\/+$/, "");
  } catch (_) { /* ignore */ }
  const env = Deno.env.get("PUBLIC_URL");
  if (env) return env.replace(/\/+$/, "");
  return null;
}

// ---- Shared branded header / footer ----
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
      companyName: data?.company_name && data.company_name !== "Re Sustainability" ? data.company_name : DEFAULT_COMPANY,
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

// ---- WhatsApp Web bridge helper ----
const BRIDGE_URL = Deno.env.get("WHATSAPP_BRIDGE_URL");
const BRIDGE_KEY = Deno.env.get("WHATSAPP_BRIDGE_API_KEY");

async function sendViaBridge(
  phone: string,
  message: string,
  mediaUrl?: string | null,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!BRIDGE_URL || !BRIDGE_KEY) {
    return { ok: false, error: "bridge_not_configured" };
  }
  try {
    const base = BRIDGE_URL.replace(/\/+$/, "");
    const res = await fetch(`${base}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": BRIDGE_KEY,
      },
      body: JSON.stringify({ phone, message, mediaUrl: mediaUrl ?? null }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[bridge] send failed", res.status, data);
      return { ok: false, error: data?.error || `http_${res.status}` };
    }
    return { ok: true, id: data?.id ?? undefined };
  } catch (e: any) {
    console.error("[bridge] send threw", e?.message || e);
    return { ok: false, error: e?.message || "bridge_unreachable" };
  }
}

function brandedHeader(b: Branding, subtitle: string): string {
  return `<div style="background:#ffffff;padding:12px 8px;border-bottom:1px solid #e5e7eb;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;min-width:320px;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
      <tr>
        <td width="96" style="width:96px;vertical-align:middle;padding:0 4px 0 8px;">
          <img src="cid:re-logo" alt="${b.companyName}" width="80" height="80" style="display:block;width:80px;height:80px;object-fit:contain;background:#ffffff;border:0;outline:none;text-decoration:none;" />
        </td>
        <td style="vertical-align:middle;text-align:center;">
          <div style="font-family:Arial,sans-serif;font-size:22px;font-weight:800;color:#dc2626;line-height:1.2;">${b.companyName}</div>
          <div style="font-family:Arial,sans-serif;font-size:12px;color:#64748b;margin-top:4px;">${subtitle}</div>
        </td>
        <td width="96" style="width:96px;">&nbsp;</td>
      </tr>
    </table>
  </div>`;
}

function brandedFooter(): string {
  return `<div style="background:#f8fafc;padding:14px 16px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:11px;font-family:Arial,sans-serif;">This is an automated email. Please do not reply.</p>
    </div>`;
}

// ---- WhatsApp branded message builder (mirrors email layout) ----
interface WhatsAppMessageOpts {
  branding: Branding;
  subtitle: string;
  recipientName: string;
  intro: string;
  statusLine?: string | null;
  details: Array<[string, string | null | undefined]>;
  companions?: any[];
  approveLink?: string | null;
  rejectLink?: string | null;
  transferLink?: string | null;
  closingLine?: string | null;
}

function buildWhatsAppMessage(opts: WhatsAppMessageOpts): string {
  const lines: string[] = [];
  lines.push(`*${opts.branding.companyName}*`);
  lines.push(`_${opts.subtitle}_`);
  lines.push("━━━━━━━━━━━━━━━━━━━━");
  lines.push("");
  lines.push(`Dear *${opts.recipientName}*,`);
  lines.push("");
  lines.push(opts.intro);
  if (opts.statusLine) {
    lines.push("");
    lines.push(opts.statusLine);
  }
  lines.push("");
  lines.push("📋 *Details*");
  for (const [label, value] of opts.details) {
    if (value && String(value).trim()) {
      lines.push(`• ${label}: ${value}`);
    }
  }

  if (opts.companions && opts.companions.length > 0) {
    lines.push("");
    lines.push(`👥 *Accompanying Persons (${opts.companions.length})*`);
    opts.companions.forEach((c: any, i: number) => {
      const devices: string[] = [];
      if (c.has_laptop) devices.push(`💻 ${c.laptop_brand || "Laptop"}${c.laptop_serial ? ` (${c.laptop_serial})` : ""}`);
      if (c.has_mobile) devices.push(`📱 ${c.mobile_brand || "Mobile"}${c.mobile_serial ? ` (${c.mobile_serial})` : ""}`);
      const phonePart = c.phone ? ` (${c.phone})` : "";
      const devicePart = devices.length ? ` — ${devices.join(", ")}` : "";
      lines.push(`${i + 1}. ${c.name}${phonePart}${devicePart}`);
    });
  }

  if (opts.approveLink && opts.rejectLink) {
    lines.push("");
    lines.push(`✅ Approve: ${opts.approveLink}`);
    lines.push(`❌ Reject:  ${opts.rejectLink}`);
    if (opts.transferLink) {
      lines.push(`🔁 Transfer to another host: ${opts.transferLink}`);
    }
  }

  if (opts.closingLine) {
    lines.push("");
    lines.push(opts.closingLine);
  }

  lines.push("");
  lines.push("━━━━━━━━━━━━━━━━━━━━");
  lines.push("This is an automated message. Please do not reply.");
  return lines.join("\n");
}

async function sendSmtpEmail(
  supabase: any,
  to: string,
  subject: string,
  html: string,
  logoBytes?: Uint8Array | null
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
      attachments: logoBytes ? [{
        filename: 're-logo.png',
        content: logoBytes,
        contentType: 'image/png',
        cid: 're-logo',
        contentDisposition: 'inline',
        encoding: 'base64',
      }] : undefined,
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
  accompanyingVisitors: any[] = [],
  branding: Branding,
  isPendingApproval: boolean = true,
  transferLink: string = ""
): string {
  const subtitle = isPendingApproval ? "Visitor Approval Required" : "Visitor Arrival Notification";
  const accent = branding.primaryColor;
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif;background-color:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
    ${brandedHeader(branding, subtitle)}
    <div style="padding:24px;">
      <h2 style="margin:0 0 16px;color:#1f2937;font-size:18px;">Dear ${hostName},</h2>
      <p style="color:#374151;font-size:14px;line-height:1.6;">${isPendingApproval ? "A visitor is waiting for your approval. Please review the details below and take action." : "A visitor has arrived to meet you. Details below."}</p>
      
      <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid ${accent};">
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

      ${isPendingApproval ? `<div style="text-align:center;margin:24px 0;">
        <a href="${approveLink}" style="display:inline-block;background:#16a34a;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;margin:4px;">✅ Approve Visit</a>
        <a href="${rejectLink}" style="display:inline-block;background:#dc2626;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;margin:4px;">❌ Reject Visit</a>
        ${transferLink ? `<a href="${transferLink}" style="display:inline-block;background:#4f46e5;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;margin:4px;">🔁 Transfer to Another Host</a>` : ""}
        ${transferLink ? `<p style="margin:12px 0 0;color:#6b7280;font-size:12px;">Can't action this visit? Use <strong>Transfer</strong> to forward it to another host at your location.</p>` : ""}
      </div>` : `<p style="text-align:center;color:#374151;font-size:14px;">Please proceed to the reception to receive your visitor.</p>`}
    </div>
    ${brandedFooter()}
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
  purpose: string | undefined,
  branding: Branding
): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif;background-color:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
    ${brandedHeader(branding, "Visit Request Submitted")}
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
    ${brandedFooter()}
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

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      return new Response(
        JSON.stringify({ error: "Database service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const publicUrl = (await resolvePublicUrl(req, supabase))
      || "https://visitbuddy-digital-friend.lovable.app";
    console.log(`[notify-host] publicUrl = ${publicUrl}`);
    const { visitorId, force }: NotifyHostRequest = await req.json();
    const branding = await getBranding(supabase);
    const logoBytes = await fetchLogoBytes(branding.logoUrl);

    // Provider preference (twilio | whatsapp_web). Defaults to twilio.
    let whatsappProvider: "twilio" | "whatsapp_web" = "twilio";
    try {
      const { data: ts } = await supabase
        .from("tenant_settings")
        .select("whatsapp_provider")
        .limit(1)
        .maybeSingle();
      if (ts?.whatsapp_provider === "whatsapp_web") whatsappProvider = "whatsapp_web";
    } catch (e) {
      console.warn("Could not read whatsapp_provider, defaulting to twilio");
    }
    console.log(`[notify-host] whatsapp_provider = ${whatsappProvider}`);

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
      .select("id, visitor_id, name, phone, email, company, purpose, photo_url, host_id, department_id, gate_id, status, scheduled_date")
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

    // Defer host notifications until the date of visit (Asia/Kolkata).
    // Visitor confirmation email/WhatsApp still goes out immediately so the
    // visitor knows their request was received. The cron job
    // `send-pending-approval-reminders` re-invokes this function with
    // `force: true` on the morning of the visit.
    // Always notify the host immediately, even for future-dated visits.
    // The morning cron `send-pending-approval-reminders` remains as a same-day safety net.
    const skipHost = false;

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
    let hostTransport: "twilio" | "whatsapp_web" | null = null;
    let visitorTransport: "twilio" | "whatsapp_web" | null = null;

    if (hostData.phone && !skipHost) {
      if (twilioWhatsAppNumber) {
        twilioWhatsAppNumber = twilioWhatsAppNumber.replace(/^whatsapp:/i, "").trim();
      }

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
      const transferLink = isPendingApproval
        ? `${publicUrl}/transfer-approval?id=${visitor.id}`
        : null;

      const hostMessage = buildWhatsAppMessage({
        branding,
        subtitle: isPendingApproval ? "Visitor Approval Required" : "Visitor Arrival Notification",
        recipientName: hostData.name,
        intro: isPendingApproval
          ? "A visitor is waiting for your approval. Please review the details below and take action."
          : "A visitor has arrived to meet you. Details below.",
        details: [
          ["Visitor", visitor.name],
          ["ID", visitor.visitor_id],
          ["Phone", visitor.phone],
          ["Company", visitor.company],
          ["Purpose", visitor.purpose],
          ["Department", departmentName],
          ["Entry Gate", gateName],
          ["Date", currentDate],
          ["Time", currentTime],
        ],
        companions,
        approveLink: isPendingApproval ? approveLink : null,
        rejectLink: isPendingApproval ? rejectLink : null,
        transferLink: isPendingApproval ? transferLink : null,
        closingLine: isPendingApproval ? null : "Please proceed to the reception to receive your visitor.",
      });
      const hostMediaUrl = visitor.photo_url || branding.logoUrl;

      // Try bridge first if provider is whatsapp_web
      if (whatsappProvider === "whatsapp_web") {
        const bridgeRes = await sendViaBridge(formattedHostPhone, hostMessage, hostMediaUrl);
        if (bridgeRes.ok) {
          console.log("Host notification sent via bridge:", bridgeRes.id);
          hostNotificationSent = true;
          hostMessageSid = bridgeRes.id || "";
          hostTransport = "whatsapp_web";
        } else {
          console.warn(`[notify-host] bridge failed (${bridgeRes.error}), falling back to Twilio`);
        }
      }

      // Twilio path (default, or fallback when bridge failed)
      if (!hostNotificationSent && accountSid && authToken && twilioWhatsAppNumber && twilioUrl) {
        const hostFormData = new URLSearchParams();
      hostFormData.append("To", `whatsapp:${formattedHostPhone}`);
      hostFormData.append("From", `whatsapp:${twilioWhatsAppNumber}`);
      hostFormData.append("Body", hostMessage);
      if (hostMediaUrl) {
        hostFormData.append("MediaUrl", hostMediaUrl);
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
          hostTransport = "twilio";
        } else {
          console.error("Failed to send host notification:", twilioResult);
        }
      } catch (whatsappError) {
        console.error("WhatsApp send error to host:", whatsappError);
      }
      } else if (!hostNotificationSent) {
        console.log("Twilio not configured, skipping host WhatsApp fallback");
      }
    } else if (!hostData.phone) {
      console.log("Host has no phone, skipping WhatsApp to host");
    } else {
      console.log("Host WhatsApp deferred (future-dated visit)");
    }

    // WhatsApp confirmation to visitor
    if (visitor.phone) {
      let formattedVisitorPhone = visitor.phone.replace(/\s/g, "").replace(/-/g, "");
      if (!formattedVisitorPhone.startsWith("+")) {
        formattedVisitorPhone = "+91" + formattedVisitorPhone.replace(/^0/, "");
      }

      const isPendingApproval = visitor.status === "pending_approval";
      const visitorMessage = buildWhatsAppMessage({
        branding,
        subtitle: isPendingApproval ? "Visit Request Submitted" : "Check-in Confirmed",
        recipientName: visitor.name,
        intro: isPendingApproval
          ? "Your visit request has been submitted and is now pending approval from your host."
          : "Your check-in has been recorded successfully!",
        statusLine: isPendingApproval ? "⏳ Status: Awaiting Host Approval" : null,
        details: [
          ["Visitor ID", visitor.visitor_id],
          ["Purpose", visitor.purpose],
          ["Host", hostData.name],
          ["Department", departmentName],
          ["Entry Gate", gateName],
          ["Date", currentDate],
          ["Time", currentTime],
        ],
        closingLine: isPendingApproval
          ? "You will receive another message once your host approves the visit."
          : (hostNotificationSent ? "Your host has been notified of your arrival." : "Please wait at the reception area."),
      });

      // Try bridge first if provider is whatsapp_web
      if (whatsappProvider === "whatsapp_web") {
        const bridgeRes = await sendViaBridge(formattedVisitorPhone, visitorMessage, branding.logoUrl);
        if (bridgeRes.ok) {
          console.log("Visitor confirmation sent via bridge:", bridgeRes.id);
          visitorNotificationSent = true;
          visitorTransport = "whatsapp_web";
        } else {
          console.warn(`[notify-host] visitor bridge failed (${bridgeRes.error}), falling back to Twilio`);
        }
      }

      if (!visitorNotificationSent && accountSid && authToken && twilioWhatsAppNumber && twilioUrl) {
        const visitorFormData = new URLSearchParams();
      visitorFormData.append("To", `whatsapp:${formattedVisitorPhone}`);
      visitorFormData.append("From", `whatsapp:${twilioWhatsAppNumber}`);
      visitorFormData.append("Body", visitorMessage);
      if (branding.logoUrl) {
        visitorFormData.append("MediaUrl", branding.logoUrl);
      }

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
          visitorTransport = "twilio";
        } else {
          console.error("Failed to send visitor confirmation:", twilioResult);
        }
      } catch (whatsappError) {
        console.error("WhatsApp send error to visitor:", whatsappError);
      }
      }
    }

    // ---- Email notifications ----
    let hostEmailSent = false;
    let visitorEmailSent = false;

    // Email to host (if host has email and visitor is pending approval)
    if (hostData.email && isPendingApproval && !skipHost) {
      const approveLink = `${publicUrl}/approve-visitor?id=${visitor.id}&action=approve`;
      const rejectLink = `${publicUrl}/approve-visitor?id=${visitor.id}&action=reject`;
      const transferLink = `${publicUrl}/transfer-approval?id=${visitor.id}`;
      const hostEmailHtml = generateHostApprovalEmail(
        visitor, hostData.name, gateName, departmentName,
        currentDate, currentTime, approveLink, rejectLink, companions, branding, true, transferLink
      );
      hostEmailSent = await sendSmtpEmail(
        supabase, hostData.email,
        `Visitor Approval Required — ${visitor.name}`,
        hostEmailHtml,
        logoBytes
      );
    } else if (hostData.email && !isPendingApproval && !skipHost) {
      // For direct check-in, still notify host via email
      const hostEmailHtml = generateHostApprovalEmail(
        visitor, hostData.name, gateName, departmentName,
        currentDate, currentTime, "", "", companions, branding, false
      );
      hostEmailSent = await sendSmtpEmail(
        supabase, hostData.email,
        `Visitor Arrival — ${visitor.name}`,
        hostEmailHtml,
        logoBytes
      );
    }

    // Email to visitor (if visitor has email)
    if (visitor.email && isPendingApproval) {
      const visitorEmailHtml = generateVisitorConfirmationEmail(
        visitor.name, visitor.visitor_id, hostData.name,
        departmentName, gateName, currentDate, currentTime, visitor.purpose, branding
      );
      visitorEmailSent = await sendSmtpEmail(
        supabase, visitor.email,
        "Visit Request Submitted — Awaiting Approval",
        visitorEmailHtml,
        logoBytes
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notifications processed",
        whatsappProvider,
        hostNotified: hostNotificationSent,
        hostTransport,
        hostMessageSid: hostMessageSid || null,
        visitorNotified: visitorNotificationSent,
        visitorTransport,
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
