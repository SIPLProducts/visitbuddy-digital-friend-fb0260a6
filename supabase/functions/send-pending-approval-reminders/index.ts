import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Accept optional { date: "YYYY-MM-DD" } body for replaying a specific
    // day from curl. Default = today in Asia/Kolkata.
    let overrideDate: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json().catch(() => ({}));
        if (body && typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
          overrideDate = body.date;
        }
      } catch (_) { /* ignore */ }
    }

    const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const targetDate = overrideDate || todayIST;
    console.log(`[reminders] running for IST date ${targetDate}${overrideDate ? " (override)" : ""}`);

    const { data: visitors, error } = await supabase
      .from("visitors")
      .select("id, name, scheduled_date, status, host_id, location_id")
      .eq("status", "pending_approval")
      .eq("scheduled_date", targetDate);

    if (error) {
      console.error("[reminders] query error", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`[reminders] found ${visitors?.length ?? 0} pending visitor(s) for ${targetDate}`);

    const results: any[] = [];
    let okCount = 0;
    let failCount = 0;
    for (const v of visitors || []) {
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/notify-host`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
            "apikey": serviceKey,
          },
          body: JSON.stringify({ visitorId: v.id, force: true }),
        });
        const body = await resp.json().catch(() => ({}));
        if (resp.ok) okCount++; else failCount++;
        console.log(
          `[reminders] visitor=${v.id} name="${v.name}" host=${v.host_id || "—"} ` +
          `notify-host status=${resp.status} ok=${resp.ok}`
        );
        results.push({
          id: v.id,
          name: v.name,
          host_id: v.host_id,
          notifyStatus: resp.status,
          ok: resp.ok,
          body,
        });
      } catch (e: any) {
        failCount++;
        console.error(`[reminders] failed for ${v.id}`, e?.message || e);
        results.push({
          id: v.id,
          name: v.name,
          host_id: v.host_id,
          ok: false,
          error: e?.message || String(e),
        });
      }
    }

    console.log(`[reminders] summary date=${targetDate} total=${results.length} ok=${okCount} failed=${failCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        date: targetDate,
        overrideDate: overrideDate || undefined,
        count: results.length,
        ok: okCount,
        failed: failCount,
        results,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    console.error("[reminders] error", err);
    return new Response(JSON.stringify({ error: err?.message || "unknown" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
