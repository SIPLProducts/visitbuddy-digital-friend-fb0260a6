import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get retention days from tenant_settings
    const { data: settings } = await supabase
      .from("tenant_settings")
      .select("data_retention_days")
      .limit(1)
      .single();

    const retentionDays = settings?.data_retention_days ?? 30;

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffISO = cutoffDate.toISOString();

    // Find visitors older than retention period
    const { data: oldVisitors, error: fetchError } = await supabase
      .from("visitors")
      .select("id")
      .lt("created_at", cutoffISO);

    if (fetchError) {
      throw new Error(`Failed to fetch old visitors: ${fetchError.message}`);
    }

    if (!oldVisitors || oldVisitors.length === 0) {
      return new Response(
        JSON.stringify({ message: "No visitors to delete", deleted: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const visitorIds = oldVisitors.map((v) => v.id);

    // Delete related records first (cascade)
    const { error: accError } = await supabase
      .from("accompanying_visitors")
      .delete()
      .in("visitor_id", visitorIds);

    if (accError) {
      console.error("Error deleting accompanying_visitors:", accError.message);
    }

    const { error: agrError } = await supabase
      .from("visitor_agreements")
      .delete()
      .in("visitor_id", visitorIds);

    if (agrError) {
      console.error("Error deleting visitor_agreements:", agrError.message);
    }

    // Delete the visitors
    const { error: delError } = await supabase
      .from("visitors")
      .delete()
      .in("id", visitorIds);

    if (delError) {
      throw new Error(`Failed to delete visitors: ${delError.message}`);
    }

    console.log(`Auto-deleted ${visitorIds.length} visitors older than ${retentionDays} days`);

    return new Response(
      JSON.stringify({
        message: `Deleted ${visitorIds.length} visitors older than ${retentionDays} days`,
        deleted: visitorIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Auto-delete error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
