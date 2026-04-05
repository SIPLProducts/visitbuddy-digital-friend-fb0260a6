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
    const url = new URL(req.url);
    const cameraUrl = url.searchParams.get("url");
    const authUser = url.searchParams.get("user");
    const authPass = url.searchParams.get("pass");

    if (!cameraUrl) {
      return new Response(
        JSON.stringify({ error: "url parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the actual fetch URL with credentials embedded if provided
    let fetchUrl = cameraUrl;
    if (authUser && authPass) {
      const parsed = new URL(cameraUrl);
      parsed.username = authUser;
      parsed.password = authPass;
      fetchUrl = parsed.toString();
    }

    const fetchHeaders: Record<string, string> = {
      // Required for ngrok free tier to skip browser warning
      "ngrok-skip-browser-warning": "true",
    };

    // Also add Basic Auth header as fallback
    if (authUser && authPass) {
      const credentials = btoa(`${authUser}:${authPass}`);
      fetchHeaders["Authorization"] = `Basic ${credentials}`;
    }

    const response = await fetch(fetchUrl, { headers: fetchHeaders });

    if (!response.ok) {
      // Log for debugging
      const body = await response.text();
      console.error(`Camera error: status=${response.status}, body=${body.substring(0, 200)}`);
      return new Response(
        JSON.stringify({ error: `Camera returned ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imageData = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    return new Response(imageData, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "no-cache, no-store",
      },
    });
  } catch (err) {
    console.error("Camera proxy error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
