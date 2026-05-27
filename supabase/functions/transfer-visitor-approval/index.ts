import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TransferRequest {
  visitorId?: string;
  newHostId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Capture the caller's app origin so notify-host can build approval links
    // pointing at the live tenant instead of falling back to PUBLIC_URL env.
    let callerOrigin =
      req.headers.get("origin") || req.headers.get("referer") || "";
    if (!callerOrigin) {
      // Fall back to the configured tenant public URL so the new host's email
      // link points at the on-prem deployment instead of the default.
      try {
        const { data: ts } = await supabase
          .from("tenant_settings")
          .select("public_app_url")
          .limit(1)
          .maybeSingle();
        if (ts?.public_app_url) callerOrigin = String(ts.public_app_url);
      } catch (_) { /* non-fatal */ }
    }
    const body: TransferRequest = await req.json().catch(() => ({}));
    const visitorId = (body.visitorId || "").trim();
    const newHostId = (body.newHostId || "").trim();

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(visitorId) || !uuidRe.test(newHostId)) {
      return new Response(JSON.stringify({ error: "visitorId and newHostId are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Load visitor + gate -> location
    const { data: visitor, error: vErr } = await supabase
      .from("visitors")
      .select("id, name, status, host_id, gate_id, gates:gates(location_id)")
      .eq("id", visitorId)
      .maybeSingle();

    if (vErr || !visitor) {
      return new Response(JSON.stringify({ error: "Visitor not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (visitor.status !== "pending_approval") {
      return new Response(
        JSON.stringify({ error: "Visitor is not pending approval", currentStatus: visitor.status }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    if (visitor.host_id === newHostId) {
      return new Response(JSON.stringify({ error: "New host is the same as current host" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const visitorLocationId = (visitor as any).gates?.location_id ?? null;

    // Load new host
    const { data: newHost, error: hErr } = await supabase
      .from("employees")
      .select("id, name, email, phone, is_host, location_id")
      .eq("id", newHostId)
      .maybeSingle();

    if (hErr || !newHost) {
      return new Response(JSON.stringify({ error: "Selected host not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!newHost.is_host) {
      return new Response(JSON.stringify({ error: "Selected employee is not a host" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (visitorLocationId && newHost.location_id && newHost.location_id !== visitorLocationId) {
      return new Response(
        JSON.stringify({ error: "Selected host is not at the visitor's location" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // Look up previous host name for the audit log
    let previousHostName: string | null = null;
    if (visitor.host_id) {
      const { data: prev } = await supabase
        .from("employees")
        .select("name")
        .eq("id", visitor.host_id)
        .maybeSingle();
      previousHostName = prev?.name ?? null;
    }

    // Update host_id, keep pending_approval
    const { error: updErr } = await supabase
      .from("visitors")
      .update({ host_id: newHostId })
      .eq("id", visitorId);

    if (updErr) {
      console.error("Failed to update visitor host:", updErr);
      return new Response(JSON.stringify({ error: "Failed to transfer approval" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      action: "visitor_approval_transferred",
      entity_type: "visitor",
      entity_id: visitorId,
      entity_name: visitor.name,
      location_id: visitorLocationId,
      details: {
        previous_host_id: visitor.host_id,
        previous_host_name: previousHostName,
        new_host_id: newHostId,
        new_host_name: newHost.name,
      },
    });

    // Trigger fresh approval notification to new host
    try {
      await supabase.functions.invoke("notify-host", {
        body: { visitorId, force: true },
        headers: callerOrigin ? { origin: callerOrigin } : undefined,
      });
    } catch (e) {
      console.error("notify-host invoke failed:", e);
      // Don't fail the transfer if notification dispatch errors
    }

    return new Response(
      JSON.stringify({
        success: true,
        newHostName: newHost.name,
        newHostEmail: newHost.email,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (err: any) {
    console.error("transfer-visitor-approval error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);