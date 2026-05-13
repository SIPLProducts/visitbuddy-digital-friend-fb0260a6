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

    // Today in Asia/Kolkata as YYYY-MM-DD
    const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    console.log(`[reminders] running for IST date ${todayIST}`);

    const { data: visitors, error } = await supabase
      .from("visitors")
      .select("id, name, scheduled_date, status")
      .eq("status", "pending_approval")
      .eq("scheduled_date", todayIST);

    if (error) {
      console.error("[reminders] query error", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const results: any[] = [];
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
        console.log(`[reminders] notified ${v.id} status=${resp.status}`);
        results.push({ id: v.id, name: v.name, ok: resp.ok, body });
      } catch (e: any) {
        console.error(`[reminders] failed for ${v.id}`, e?.message || e);
        results.push({ id: v.id, name: v.name, ok: false, error: e?.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, date: todayIST, count: results.length, results }),
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
