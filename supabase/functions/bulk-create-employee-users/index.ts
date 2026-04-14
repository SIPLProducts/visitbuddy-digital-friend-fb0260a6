import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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

    const LOCATION_ID = "013e5f3f-0fee-45a8-a1a8-c625ef9e53bb";
    const PASSWORD = "123456";

    // Fetch all employees with emails
    const { data: employees, error: empError } = await supabase
      .from("employees")
      .select("id, name, email")
      .not("email", "is", null)
      .neq("email", "");

    if (empError) throw empError;

    const results = { created: [] as string[], skipped: [] as string[], errors: [] as string[] };

    for (const emp of employees || []) {
      try {
        // Create auth user
        const { data: userData, error: createError } = await supabase.auth.admin.createUser({
          email: emp.email,
          password: PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: emp.name },
        });

        if (createError) {
          if (createError.message?.includes("already been registered") || createError.message?.includes("already exists")) {
            results.skipped.push(emp.email);
            continue;
          }
          results.errors.push(`${emp.email}: ${createError.message}`);
          continue;
        }

        const userId = userData.user.id;

        // Create profile
        await supabase.from("profiles").upsert({
          user_id: userId,
          full_name: emp.name,
        }, { onConflict: "user_id" });

        // Assign manager role at HWMP location
        await supabase.from("user_location_roles").insert({
          user_id: userId,
          location_id: LOCATION_ID,
          role: "manager",
        });

        results.created.push(emp.email);
      } catch (e) {
        results.errors.push(`${emp.email}: ${e.message}`);
      }
    }

    return new Response(JSON.stringify({
      total_employees: employees?.length || 0,
      created: results.created.length,
      skipped: results.skipped.length,
      errors: results.errors.length,
      details: results,
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
