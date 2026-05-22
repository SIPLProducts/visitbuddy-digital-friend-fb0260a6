import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, password, full_name, location_id } = await req.json();
    if (!email || !password || !location_id) {
      return new Response(JSON.stringify({ error: "email, password, location_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: createErr } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: full_name ?? email },
    });
    if (createErr) throw createErr;

    const userId = userData.user.id;

    await supabase.from("profiles").upsert(
      { user_id: userId, full_name: full_name ?? email },
      { onConflict: "user_id" },
    );

    const { error: roleErr } = await supabase.from("user_location_roles").insert({
      user_id: userId,
      location_id,
      role: "operator",
      is_ho_admin: false,
      is_admin_head: true,
    });
    if (roleErr) throw roleErr;

    return new Response(JSON.stringify({ ok: true, user_id: userId, email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});