import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { plate_number, gate_id, image_url } = await req.json();

    if (!plate_number) {
      return new Response(
        JSON.stringify({ error: "plate_number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Normalize plate number (remove spaces, dashes, uppercase)
    const normalizedPlate = plate_number.replace(/[\s-]/g, "").toUpperCase();

    // Get gate's location_id if gate_id provided
    let location_id: string | null = null;
    if (gate_id) {
      const { data: gate } = await supabase
        .from("gates")
        .select("location_id")
        .eq("id", gate_id)
        .single();
      location_id = gate?.location_id || null;
    }

    // Search for matching vehicle
    const { data: vehicles } = await supabase
      .from("vehicles")
      .select("*")
      .ilike("vehicle_number", `%${normalizedPlate}%`);

    const matchedVehicle = vehicles && vehicles.length > 0 ? vehicles[0] : null;
    let matchStatus = "unmatched";

    if (matchedVehicle) {
      matchStatus = "matched";

      // Auto check-in if auto_allow is true
      if (matchedVehicle.auto_allow) {
        // Check if already inside
        const { data: activeEntry } = await supabase
          .from("vehicle_entries")
          .select("id")
          .eq("vehicle_id", matchedVehicle.id)
          .is("exit_time", null)
          .maybeSingle();

        if (activeEntry) {
          // Auto check-out
          await supabase
            .from("vehicle_entries")
            .update({ exit_time: new Date().toISOString() })
            .eq("id", activeEntry.id);

          await supabase
            .from("vehicles")
            .update({
              status: "checked_out",
              check_out_time: new Date().toISOString(),
            })
            .eq("id", matchedVehicle.id);

          matchStatus = "auto_checked_out";
        } else {
          // Auto check-in
          await supabase.from("vehicle_entries").insert({
            vehicle_id: matchedVehicle.id,
            gate_id: gate_id || matchedVehicle.gate_id,
            location_id: location_id || matchedVehicle.location_id,
            entry_time: new Date().toISOString(),
            purpose: "ANPR auto entry",
          });

          await supabase
            .from("vehicles")
            .update({
              status: "checked_in",
              check_in_time: new Date().toISOString(),
              check_out_time: null,
            })
            .eq("id", matchedVehicle.id);

          matchStatus = "auto_checked_in";
        }
      }
    }

    // Log the ANPR event
    const { data: event, error } = await supabase
      .from("anpr_events")
      .insert({
        plate_number: normalizedPlate,
        gate_id: gate_id || null,
        location_id,
        image_url: image_url || null,
        matched_vehicle_id: matchedVehicle?.id || null,
        match_status: matchStatus,
        event_time: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        plate_number: normalizedPlate,
        match_status: matchStatus,
        vehicle: matchedVehicle
          ? {
              id: matchedVehicle.id,
              vehicle_number: matchedVehicle.vehicle_number,
              driver_name: matchedVehicle.driver_name,
              auto_allow: matchedVehicle.auto_allow,
            }
          : null,
        event_id: event.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
