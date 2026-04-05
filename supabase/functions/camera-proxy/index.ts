const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// MD5 hash helper for Digest Auth
async function md5(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("MD5", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Parse WWW-Authenticate header for Digest Auth
function parseDigestChallenge(header: string): Record<string, string> {
  const params: Record<string, string> = {};
  const regex = /(\w+)=(?:"([^"]+)"|([^\s,]+))/g;
  let match;
  while ((match = regex.exec(header)) !== null) {
    params[match[1]] = match[2] || match[3];
  }
  return params;
}

// Generate Digest Auth response
async function makeDigestAuthHeader(
  username: string,
  password: string,
  method: string,
  uri: string,
  challenge: Record<string, string>
): Promise<string> {
  const realm = challenge.realm || "";
  const nonce = challenge.nonce || "";
  const qop = challenge.qop || "";
  const nc = "00000001";
  const cnonce = crypto.randomUUID().replace(/-/g, "").substring(0, 16);

  const ha1 = await md5(`${username}:${realm}:${password}`);
  const ha2 = await md5(`${method}:${uri}`);

  let response: string;
  if (qop === "auth" || qop.includes("auth")) {
    response = await md5(`${ha1}:${nonce}:${nc}:${cnonce}:auth:${ha2}`);
  } else {
    response = await md5(`${ha1}:${nonce}:${ha2}`);
  }

  let header = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`;
  if (qop) {
    header += `, qop=auth, nc=${nc}, cnonce="${cnonce}"`;
  }
  if (challenge.opaque) {
    header += `, opaque="${challenge.opaque}"`;
  }
  return header;
}

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

    const baseHeaders: Record<string, string> = {
      "ngrok-skip-browser-warning": "true",
    };

    // First attempt: try Basic Auth
    if (authUser && authPass) {
      const credentials = btoa(`${authUser}:${authPass}`);
      baseHeaders["Authorization"] = `Basic ${credentials}`;
    }

    let response = await fetch(cameraUrl, { headers: baseHeaders });

    // If 401, try Digest Auth
    if (response.status === 401 && authUser && authPass) {
      const wwwAuth = response.headers.get("www-authenticate") || "";
      await response.arrayBuffer(); // consume body

      if (wwwAuth.toLowerCase().startsWith("digest")) {
        console.log("Camera requires Digest Auth, attempting...");
        const challenge = parseDigestChallenge(wwwAuth);
        const parsed = new URL(cameraUrl);
        const uri = parsed.pathname + parsed.search;

        const digestHeader = await makeDigestAuthHeader(
          authUser,
          authPass,
          "GET",
          uri,
          challenge
        );

        response = await fetch(cameraUrl, {
          headers: {
            "ngrok-skip-browser-warning": "true",
            Authorization: digestHeader,
          },
        });
      }
    }

    if (!response.ok) {
      const body = await response.text();
      console.error(`Camera error: status=${response.status}, body=${body.substring(0, 300)}`);
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
