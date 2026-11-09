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
    // (accompanying rows are re-created never; safe to remove for all expired visitors)

    if (accError) {
      console.error("Error deleting accompanying_visitors:", accError.message);
    }

    // DPDP: remove signature files first, then agreement rows via the audited purge function.
    // Visitors whose signature files could not be removed are kept for the next run (no orphans).
    const { data: sigRows } = await supabase
      .from("visitor_agreements")
      .select("visitor_id, storage_path")
      .in("visitor_id", visitorIds)
      .not("storage_path", "is", null);

    const blocked = new Set<string>();
    const paths = (sigRows || []).map((r: any) => r.storage_path as string);
    for (let i = 0; i < paths.length; i += 100) {
      const chunk = paths.slice(i, i + 100);
      const { error: rmErr } = await supabase.storage.from("visitor-signatures").remove(chunk);
      if (rmErr) {
        console.error("Signature file removal failed, deferring:", rmErr.message);
        (sigRows || []).filter((r: any) => chunk.includes(r.storage_path)).forEach((r: any) => blocked.add(r.visitor_id));
      }
    }
    const purgeIds = visitorIds.filter((id) => !blocked.has(id));

    const { error: agrError } = await supabase.rpc("dpdp_purge_agreements_for_retention", { _visitor_ids: purgeIds });
    if (agrError) {
      throw new Error(`Failed to purge visitor agreements: ${agrError.message}`);
    }

    // Delete the visitors
    const { error: delError } = await supabase
      .from("visitors")
      .delete()
      .in("id", purgeIds);

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
