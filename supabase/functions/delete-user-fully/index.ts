import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Identify caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse + validate body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const targetUserId = body?.userId;
    if (!isUuid(targetUserId)) {
      return new Response(JSON.stringify({ error: "userId must be a valid UUID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (targetUserId === user.id) {
      return new Response(JSON.stringify({ error: "You cannot delete your own account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Authorize caller: HO Admin OR Location Admin (must share at least one location with target)
    const { data: callerRoles, error: callerRolesErr } = await admin
      .from("user_location_roles")
      .select("role, is_ho_admin, location_id")
      .eq("user_id", user.id);
    if (callerRolesErr) throw callerRolesErr;

    const isHoAdmin = callerRoles?.some((r) => r.is_ho_admin) ?? false;
    const callerAdminLocationIds = (callerRoles ?? [])
      .filter((r) => r.role === "admin" && !r.is_ho_admin)
      .map((r) => r.location_id);

    if (!isHoAdmin) {
      if (callerAdminLocationIds.length === 0) {
        return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Target's locations must be subset of caller's admin locations
      const { data: targetRoles, error: targetRolesErr } = await admin
        .from("user_location_roles")
        .select("location_id, is_ho_admin")
        .eq("user_id", targetUserId);
      if (targetRolesErr) throw targetRolesErr;

      const targetIsHo = targetRoles?.some((r) => r.is_ho_admin) ?? false;
      if (targetIsHo) {
        return new Response(JSON.stringify({ error: "Forbidden: cannot delete an HO Admin" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const targetLocs = (targetRoles ?? []).map((r) => r.location_id);
      const allowed = targetLocs.length > 0 && targetLocs.every((l) => callerAdminLocationIds.includes(l));
      if (!allowed) {
        return new Response(JSON.stringify({ error: "Forbidden: target user is outside your admin scope" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Look up target email for audit
    let targetEmail: string | null = null;
    let targetName: string | null = null;
    try {
      const { data: targetAuth } = await admin.auth.admin.getUserById(targetUserId);
      targetEmail = targetAuth?.user?.email ?? null;
    } catch (_) {
      // ignore
    }
    try {
      const { data: targetProfile } = await admin
        .from("profiles")
        .select("full_name")
        .eq("user_id", targetUserId)
        .maybeSingle();
      targetName = targetProfile?.full_name ?? null;
    } catch (_) {
      // ignore
    }

    // 1. Delete all role assignments
    const { error: roleDelErr } = await admin
      .from("user_location_roles")
      .delete()
      .eq("user_id", targetUserId);
    if (roleDelErr) throw roleDelErr;

    // 2. Delete profile
    const { error: profileDelErr } = await admin
      .from("profiles")
      .delete()
      .eq("user_id", targetUserId);
    if (profileDelErr) throw profileDelErr;

    // 3. Delete auth user
    const { error: authDelErr } = await admin.auth.admin.deleteUser(targetUserId);
    // If user doesn't exist in auth, treat as success (already gone)
    if (authDelErr && !`${authDelErr.message}`.toLowerCase().includes("not found")) {
      throw authDelErr;
    }

    // Audit
    try {
      await admin.from("audit_logs").insert({
        user_id: user.id,
        action: "user_deleted",
        entity_type: "user",
        entity_id: targetUserId,
        entity_name: targetName || targetEmail || targetUserId,
        details: {
          deleted_email: targetEmail,
          performed_by: user.email,
        },
      });
    } catch (_) {
      // non-fatal
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("delete-user-fully error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
