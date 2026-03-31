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

    // Fetch configurable warning hour from tenant settings
    const { data: tenantData } = await supabase
      .from("tenant_settings")
      .select("checkout_warning_hour")
      .limit(1)
      .single();
    const warningHour = tenantData?.checkout_warning_hour ?? 18;

    // Get current IST hour
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const currentISTHour = istNow.getUTCHours();

    // Only send notifications if current IST hour >= configured warning hour
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
      .select("id, name, company, check_in_time, visitor_id")
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

    // Get all admin/manager users to notify
    const { data: adminUsers, error: rolesError } = await supabase
      .from("user_location_roles")
      .select("user_id")
      .in("role", ["admin", "manager"]);

    if (rolesError) {
      throw new Error(`Failed to fetch admin users: ${rolesError.message}`);
    }

    // Deduplicate user IDs
    const uniqueUserIds = [...new Set((adminUsers || []).map((u) => u.user_id))];

    if (uniqueUserIds.length === 0) {
      return new Response(
        JSON.stringify({ message: "No admin/manager users to notify", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build notification records
    const notifications = [];
    for (const userId of uniqueUserIds) {
      // One summary notification per user
      const visitorNames = stuckVisitors
        .map((v) => `${v.name}${v.company ? ` (${v.company})` : ""}`)
        .join(", ");

      notifications.push({
        user_id: userId,
        title: "⚠️ Visitors Not Checked Out",
        message: `${stuckVisitors.length} visitor(s) still checked in after 6 PM: ${visitorNames}. Please verify and check them out.`,
        type: "warning",
        is_read: false,
      });
    }

    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (insertError) {
      throw new Error(`Failed to insert notifications: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        message: "Notifications sent successfully",
        visitorsCount: stuckVisitors.length,
        notifiedUsers: uniqueUserIds.length,
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
