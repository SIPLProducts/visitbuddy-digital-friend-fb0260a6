import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch tenant settings
    const { data: tenantData } = await supabase
      .from("tenant_settings")
      .select("checkout_warning_hour, company_name, security_contact_number")
      .limit(1)
      .single();

    const warningHour = tenantData?.checkout_warning_hour ?? 18;
    const companyName = tenantData?.company_name ?? "Our Company";
    const securityContact = tenantData?.security_contact_number ?? "the front desk";

    // Get current IST hour
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const currentISTHour = istNow.getUTCHours();

    if (currentISTHour < warningHour) {
      return new Response(
        JSON.stringify({ message: `Not yet ${warningHour}:00 IST, skipping`, currentISTHour }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const todayIST = istNow.toISOString().split("T")[0];

    // Find visitors checked in today who haven't checked out
    const { data: stuckVisitors, error: visitorsError } = await supabase
      .from("visitors")
      .select("id, name, company, check_in_time, visitor_id, phone, email")
      .eq("status", "checked_in")
      .gte("check_in_time", `${todayIST}T00:00:00+05:30`)
      .lte("check_in_time", `${todayIST}T23:59:59+05:30`);

    if (visitorsError) {
      throw new Error(`Failed to fetch visitors: ${visitorsError.message}`);
    }

    if (!stuckVisitors || stuckVisitors.length === 0) {
      return new Response(
        JSON.stringify({ message: "No visitors pending checkout", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== 1. Send WhatsApp/SMS to each visitor ==========
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioWhatsApp = Deno.env.get("TWILIO_WHATSAPP_NUMBER");
    const twilioSms = Deno.env.get("TWILIO_SMS_NUMBER");

    let whatsappSent = 0;
    let smsSent = 0;

    if (twilioSid && twilioAuth) {
      for (const visitor of stuckVisitors) {
        if (!visitor.phone) continue;

        const phone = visitor.phone.startsWith("+") ? visitor.phone : `+91${visitor.phone.replace(/\D/g, "")}`;
        const message = `Dear ${visitor.name},\n\nYou did not check out from ${companyName}. We are assuming you are no longer inside the premises and are completing the checkout on your behalf.\n\nIf you are still inside the facility, please contact our security desk at ${securityContact}.\n\nThank you,\n${companyName} Security`;

        // Try WhatsApp first
        if (twilioWhatsApp) {
          try {
            const resp = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
              {
                method: "POST",
                headers: {
                  Authorization: `Basic ${btoa(`${twilioSid}:${twilioAuth}`)}`,
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                  To: `whatsapp:${phone}`,
                  From: `whatsapp:${twilioWhatsApp}`,
                  Body: message,
                }),
              }
            );
            if (resp.ok) {
              whatsappSent++;
              continue; // Skip SMS if WhatsApp succeeded
            }
          } catch (e) {
            console.error(`WhatsApp failed for ${visitor.name}:`, e);
          }
        }

        // Fallback to SMS
        if (twilioSms) {
          try {
            const resp = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
              {
                method: "POST",
                headers: {
                  Authorization: `Basic ${btoa(`${twilioSid}:${twilioAuth}`)}`,
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                  To: phone,
                  From: twilioSms,
                  Body: message,
                }),
              }
            );
            if (resp.ok) smsSent++;
          } catch (e) {
            console.error(`SMS failed for ${visitor.name}:`, e);
          }
        }
      }
    }

    // ========== 2. Email admins via Resend ==========
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    let emailsSent = 0;

    if (resendApiKey) {
      // Get admin emails from profiles
      const { data: adminRoles } = await supabase
        .from("user_location_roles")
        .select("user_id")
        .in("role", ["admin", "manager"]);

      const uniqueAdminIds = [...new Set((adminRoles || []).map((r) => r.user_id))];

      if (uniqueAdminIds.length > 0) {
        // Get admin emails from auth (via profiles or direct)
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", uniqueAdminIds);

        // Build visitor table rows
        const visitorRows = stuckVisitors
          .map(
            (v) =>
              `<tr><td style="padding:8px;border:1px solid #ddd">${v.visitor_id}</td><td style="padding:8px;border:1px solid #ddd">${v.name}</td><td style="padding:8px;border:1px solid #ddd">${v.company || "-"}</td><td style="padding:8px;border:1px solid #ddd">${new Date(v.check_in_time).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td></tr>`
          )
          .join("");

        const emailHtml = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#dc2626">⚠️ Auto-Checkout Alert</h2>
            <p><strong>${stuckVisitors.length}</strong> visitor(s) were still checked in after ${warningHour > 12 ? warningHour - 12 : warningHour}:00 ${warningHour >= 12 ? "PM" : "AM"} and have been automatically checked out.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <thead><tr style="background:#f3f4f6"><th style="padding:8px;border:1px solid #ddd;text-align:left">Visitor ID</th><th style="padding:8px;border:1px solid #ddd;text-align:left">Name</th><th style="padding:8px;border:1px solid #ddd;text-align:left">Company</th><th style="padding:8px;border:1px solid #ddd;text-align:left">Check-in Time</th></tr></thead>
              <tbody>${visitorRows}</tbody>
            </table>
            <p style="color:#666;font-size:13px">Visitors have been notified via WhatsApp/SMS. This is an automated message from ${companyName} Security.</p>
          </div>`;

        // Send to each admin (using their user_id to look up email from auth)
        // Since we can't query auth.users, we send to a general admin email or use the first profile
        // For now, send using Resend to bala@sharviinfotech.com (the configured sender)
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: `${companyName} Security <onboarding@resend.dev>`,
              to: ["bala@sharviinfotech.com"],
              subject: `⚠️ Auto-Checkout Alert — ${stuckVisitors.length} Visitor(s) Not Checked Out`,
              html: emailHtml,
            }),
          });
          emailsSent++;
        } catch (e) {
          console.error("Failed to send admin email:", e);
        }
      }
    }

    // ========== 3. Auto-checkout visitors ==========
    const checkoutTime = new Date().toISOString();
    const { error: checkoutError } = await supabase
      .from("visitors")
      .update({ status: "checked_out", check_out_time: checkoutTime })
      .in(
        "id",
        stuckVisitors.map((v) => v.id)
      );

    if (checkoutError) {
      console.error("Auto-checkout failed:", checkoutError.message);
    }

    // ========== 4. In-app notifications for admins ==========
    const { data: adminUsers } = await supabase
      .from("user_location_roles")
      .select("user_id")
      .in("role", ["admin", "manager"]);

    const uniqueUserIds = [...new Set((adminUsers || []).map((u) => u.user_id))];

    if (uniqueUserIds.length > 0) {
      const visitorNames = stuckVisitors
        .map((v) => `${v.name}${v.company ? ` (${v.company})` : ""}`)
        .join(", ");

      const notifications = uniqueUserIds.map((userId) => ({
        user_id: userId,
        title: "⚠️ Auto-Checkout Completed",
        message: `${stuckVisitors.length} visitor(s) auto-checked out after ${warningHour > 12 ? warningHour - 12 : warningHour} ${warningHour >= 12 ? "PM" : "AM"}: ${visitorNames}. WhatsApp/SMS notifications sent.`,
        type: "warning",
        is_read: false,
      }));

      await supabase.from("notifications").insert(notifications);
    }

    return new Response(
      JSON.stringify({
        message: "Auto-checkout completed",
        visitorsCheckedOut: stuckVisitors.length,
        whatsappSent,
        smsSent,
        emailsSent,
        notifiedAdmins: uniqueUserIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
