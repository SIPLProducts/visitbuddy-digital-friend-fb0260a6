import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// MD5 for Digest Auth (same as camera-proxy)
function md5(input: string): string {
  const bytes = new TextEncoder().encode(input);
  function safeAdd(x: number, y: number) { const lsw = (x & 0xffff) + (y & 0xffff); return ((x >> 16) + (y >> 16) + (lsw >> 16)) << 16 | lsw & 0xffff; }
  function bitRotateLeft(num: number, cnt: number) { return num << cnt | num >>> 32 - cnt; }
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) { return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b); }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(b & c | ~b & d, a, b, x, s, t); }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(b & d | c & ~d, a, b, x, s, t); }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(c ^ (b | ~d), a, b, x, s, t); }
  const n = bytes.length;
  const padLen = ((n + 8) >>> 6) + 1;
  const tail = new Uint8Array(padLen * 64);
  tail.set(bytes);
  tail[n] = 0x80;
  const view = new DataView(tail.buffer);
  view.setUint32((padLen * 64) - 8, n * 8, true);
  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  for (let i = 0; i < padLen * 16; i += 16) {
    const x: number[] = [];
    for (let j = 0; j < 16; j++) x[j] = view.getUint32((i + j) * 4, true);
    const aa = a, bb = b, cc = c, dd = d;
    a=ff(a,b,c,d,x[0],7,-680876936);d=ff(d,a,b,c,x[1],12,-389564586);c=ff(c,d,a,b,x[2],17,606105819);b=ff(b,c,d,a,x[3],22,-1044525330);
    a=ff(a,b,c,d,x[4],7,-176418897);d=ff(d,a,b,c,x[5],12,1200080426);c=ff(c,d,a,b,x[6],17,-1473231341);b=ff(b,c,d,a,x[7],22,-45705983);
    a=ff(a,b,c,d,x[8],7,1770035416);d=ff(d,a,b,c,x[9],12,-1958414417);c=ff(c,d,a,b,x[10],17,-42063);b=ff(b,c,d,a,x[11],22,-1990404162);
    a=ff(a,b,c,d,x[12],7,1804603682);d=ff(d,a,b,c,x[13],12,-40341101);c=ff(c,d,a,b,x[14],17,-1502002290);b=ff(b,c,d,a,x[15],22,1236535329);
    a=gg(a,b,c,d,x[1],5,-165796510);d=gg(d,a,b,c,x[6],9,-1069501632);c=gg(c,d,a,b,x[11],14,643717713);b=gg(b,c,d,a,x[0],20,-373897302);
    a=gg(a,b,c,d,x[5],5,-701558691);d=gg(d,a,b,c,x[10],9,38016083);c=gg(c,d,a,b,x[15],14,-660478335);b=gg(b,c,d,a,x[4],20,-405537848);
    a=gg(a,b,c,d,x[9],5,568446438);d=gg(d,a,b,c,x[14],9,-1019803690);c=gg(c,d,a,b,x[3],14,-187363961);b=gg(b,c,d,a,x[8],20,1163531501);
    a=gg(a,b,c,d,x[13],5,-1444681467);d=gg(d,a,b,c,x[2],9,-51403784);c=gg(c,d,a,b,x[7],14,1735328473);b=gg(b,c,d,a,x[12],20,-1926607734);
    a=hh(a,b,c,d,x[5],4,-378558);d=hh(d,a,b,c,x[8],11,-2022574463);c=hh(c,d,a,b,x[11],16,1839030562);b=hh(b,c,d,a,x[14],23,-35309556);
    a=hh(a,b,c,d,x[1],4,-1530992060);d=hh(d,a,b,c,x[4],11,1272893353);c=hh(c,d,a,b,x[7],16,-155497632);b=hh(b,c,d,a,x[10],23,-1094730640);
    a=hh(a,b,c,d,x[13],4,681279174);d=hh(d,a,b,c,x[0],11,-358537222);c=hh(c,d,a,b,x[3],16,-722521979);b=hh(b,c,d,a,x[6],23,76029189);
    a=hh(a,b,c,d,x[9],4,-640364487);d=hh(d,a,b,c,x[12],11,-421815835);c=hh(c,d,a,b,x[15],16,530742520);b=hh(b,c,d,a,x[2],23,-995338651);
    a=ii(a,b,c,d,x[0],6,-198630844);d=ii(d,a,b,c,x[7],10,1126891415);c=ii(c,d,a,b,x[14],15,-1416354905);b=ii(b,c,d,a,x[5],21,-57434055);
    a=ii(a,b,c,d,x[12],6,1700485571);d=ii(d,a,b,c,x[3],10,-1894986606);c=ii(c,d,a,b,x[10],15,-1051523);b=ii(b,c,d,a,x[1],21,-2054922799);
    a=ii(a,b,c,d,x[8],6,1873313359);d=ii(d,a,b,c,x[15],10,-30611744);c=ii(c,d,a,b,x[6],15,-1560198380);b=ii(b,c,d,a,x[13],21,1309151649);
    a=ii(a,b,c,d,x[4],6,-145523070);d=ii(d,a,b,c,x[11],10,-1120210379);c=ii(c,d,a,b,x[2],15,718787259);b=ii(b,c,d,a,x[9],21,-343485551);
    a=safeAdd(a,aa);b=safeAdd(b,bb);c=safeAdd(c,cc);d=safeAdd(d,dd);
  }
  const hex = (n: number) => { let s = ''; for (let i = 0; i < 4; i++) s += ((n >> (i * 8 + 4)) & 0xf).toString(16) + ((n >> (i * 8)) & 0xf).toString(16); return s; };
  return hex(a) + hex(b) + hex(c) + hex(d);
}

function parseDigestChallenge(header: string): Record<string, string> {
  const params: Record<string, string> = {};
  const regex = /(\w+)=(?:"([^"]+)"|([^\s,]+))/g;
  let match;
  while ((match = regex.exec(header)) !== null) {
    params[match[1]] = match[2] || match[3];
  }
  return params;
}

function makeDigestAuthHeader(
  username: string, password: string, method: string, uri: string,
  challenge: Record<string, string>
): string {
  const realm = challenge.realm || "";
  const nonce = challenge.nonce || "";
  const qop = challenge.qop || "";
  const nc = "00000001";
  const cnonce = crypto.randomUUID().replace(/-/g, "").substring(0, 16);
  const ha1 = md5(`${username}:${realm}:${password}`);
  const ha2 = md5(`${method}:${uri}`);
  let response: string;
  if (qop === "auth" || qop.includes("auth")) {
    response = md5(`${ha1}:${nonce}:${nc}:${cnonce}:auth:${ha2}`);
  } else {
    response = md5(`${ha1}:${nonce}:${ha2}`);
  }
  let header = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`;
  if (qop) header += `, qop=auth, nc=${nc}, cnonce="${cnonce}"`;
  if (challenge.opaque) header += `, opaque="${challenge.opaque}"`;
  return header;
}

type SnapshotResult =
  | { ok: true; imageBuffer: ArrayBuffer }
  | { ok: false; retryable: boolean; status?: number; error: string };

const retryableCameraStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);
const textDecoder = new TextDecoder();

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withCacheBuster(url: string, attempt: number): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("_ts", `${Date.now()}-${attempt}`);
    return parsed.toString();
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}_ts=${Date.now()}-${attempt}`;
  }
}

function isLikelyImageResponse(contentType: string, bytes: Uint8Array): boolean {
  if (contentType.startsWith("image/")) return true;
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true;
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return true;
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return true;
  return false;
}

async function fetchCameraSnapshot(cameraUrl: string, user?: string, pass?: string): Promise<SnapshotResult> {
  const maxRetries = 5;
  let backoffMs = 1000;
  let lastStatus: number | undefined;
  let lastError = "Camera temporarily unavailable";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const requestUrl = withCacheBuster(cameraUrl, attempt);

    try {
      const headers: Record<string, string> = {
        "ngrok-skip-browser-warning": "true",
        "Accept": "image/*,*/*;q=0.8",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      };

      if (user && pass) {
        headers["Authorization"] = `Basic ${btoa(`${user}:${pass}`)}`;
      }

      let response = await fetch(requestUrl, { headers });

      if (response.status === 401 && user && pass) {
        const wwwAuth = response.headers.get("www-authenticate") || "";
        await response.arrayBuffer();

        if (wwwAuth.toLowerCase().startsWith("digest")) {
          const challenge = parseDigestChallenge(wwwAuth);
          const parsed = new URL(requestUrl);
          const uri = parsed.pathname + parsed.search;
          const digestHeader = makeDigestAuthHeader(user, pass, "GET", uri, challenge);

          response = await fetch(requestUrl, {
            headers: {
              ...headers,
              Authorization: digestHeader,
            },
          });
        }
      }

      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      const imageBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(imageBuffer);

      if (response.ok && isLikelyImageResponse(contentType, bytes)) {
        return { ok: true, imageBuffer };
      }

      const preview = textDecoder.decode(bytes.slice(0, 180)).replace(/\s+/g, " ").trim();
      const looksLikeNgrokHtml = preview.toLowerCase().includes("ngrok") || preview.toLowerCase().includes("<!doctype html");
      const isRetryable = retryableCameraStatuses.has(response.status) || looksLikeNgrokHtml;

      lastStatus = response.status || undefined;
      lastError = response.ok
        ? `Camera returned non-image content${contentType ? ` (${contentType})` : ""}`
        : `Camera returned ${response.status}`;

      if (isRetryable && attempt < maxRetries) {
        console.log(
          `Camera unavailable on attempt ${attempt}/${maxRetries} (status=${response.status || "n/a"}, contentType=${contentType || "unknown"}). Retrying in ${backoffMs}ms... Preview: ${preview}`
        );
        await delay(backoffMs);
        backoffMs *= 2;
        continue;
      }

      return {
        ok: false,
        retryable: isRetryable,
        status: response.status || undefined,
        error: isRetryable
          ? `Camera temporarily unavailable after ${maxRetries} attempts`
          : lastError,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown camera fetch error";
      lastError = message;

      if (attempt < maxRetries) {
        console.log(`Camera fetch error on attempt ${attempt}/${maxRetries}: ${message}. Retrying in ${backoffMs}ms...`);
        await delay(backoffMs);
        backoffMs *= 2;
        continue;
      }

      return {
        ok: false,
        retryable: true,
        status: lastStatus,
        error: `Camera temporarily unavailable after ${maxRetries} attempts`,
      };
    }
  }

  return {
    ok: false,
    retryable: true,
    status: lastStatus,
    error: lastError,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { gate_id } = await req.json();
    
    if (!gate_id) {
      return new Response(
        JSON.stringify({ error: "gate_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!lovableApiKey && !geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured (set LOVABLE_API_KEY or GEMINI_API_KEY)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get gate camera config
    const { data: gate, error: gateError } = await supabase
      .from("gates")
      .select("id, name, camera_url, camera_type, camera_enabled, location_id")
      .eq("id", gate_id)
      .single();

    if (gateError || !gate?.camera_url || !gate.camera_enabled) {
      return new Response(
        JSON.stringify({ error: "Gate not found or camera not enabled" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract credentials from camera URL
    let cleanUrl = gate.camera_url;
    let authUser: string | undefined;
    let authPass: string | undefined;
    try {
      const parsed = new URL(gate.camera_url);
      if (parsed.username || parsed.password) {
        authUser = decodeURIComponent(parsed.username);
        authPass = decodeURIComponent(parsed.password);
        parsed.username = "";
        parsed.password = "";
        cleanUrl = parsed.toString();
      }
    } catch { /* use as-is */ }

    // Fetch camera snapshot
    console.log(`Fetching snapshot from gate: ${gate.name}`);
    const snapshotResult = await fetchCameraSnapshot(cleanUrl, authUser, authPass);
    if (!snapshotResult.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          retryable: snapshotResult.retryable,
          status: snapshotResult.retryable ? "camera_unavailable" : "camera_error",
          plates: [],
          error: snapshotResult.error,
        }),
        {
          status: snapshotResult.retryable ? 200 : 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const imageBuffer = snapshotResult.imageBuffer;
    const base64Image = btoa(
      String.fromCharCode(...new Uint8Array(imageBuffer))
    );

    console.log(`Snapshot fetched, size: ${imageBuffer.byteLength} bytes. Sending to AI for plate detection...`);

    // Send to Gemini Vision for plate detection
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a vehicle license plate reader. Analyze the image and extract any visible vehicle license plate numbers. 
Rules:
- Return ONLY the plate number(s) found, nothing else
- If multiple plates are visible, return each on a new line
- Remove spaces and dashes from plate numbers
- Use uppercase letters
- If no plate is clearly visible or readable, respond with exactly: NO_PLATE
- Do not guess or make up plate numbers - only return plates you can read with confidence`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Read any vehicle license plate numbers visible in this CCTV camera image."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_plates",
              description: "Report detected license plate numbers from the camera image",
              parameters: {
                type: "object",
                properties: {
                  plates: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        plate_number: { type: "string", description: "The license plate number detected" },
                        confidence: { type: "string", enum: ["high", "medium", "low"], description: "Confidence level of the reading" }
                      },
                      required: ["plate_number", "confidence"],
                      additionalProperties: false
                    }
                  },
                  no_plate_detected: { type: "boolean", description: "Set to true if no plate was detected" }
                },
                required: ["plates", "no_plate_detected"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "report_plates" } }
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error(`AI error: ${aiResponse.status}`, errText);
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI rate limited, try again shortly" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "AI plate detection failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.log("AI returned no tool call, no plate detected");
      return new Response(
        JSON.stringify({ success: true, plates: [], message: "No plate detected" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const plateData = JSON.parse(toolCall.function.arguments);
    console.log("AI plate detection result:", JSON.stringify(plateData));

    if (plateData.no_plate_detected || !plateData.plates || plateData.plates.length === 0) {
      return new Response(
        JSON.stringify({ success: true, plates: [], message: "No plate detected" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process each detected plate
    const results = [];
    for (const plate of plateData.plates) {
      if (plate.confidence === "low") continue; // Skip low confidence
      
      const normalizedPlate = plate.plate_number.replace(/[\s\-\.]/g, "").toUpperCase();
      if (!normalizedPlate || normalizedPlate === "NO_PLATE") continue;

      // Check for duplicate detection (same plate in last 30 seconds)
      const { data: recentEvent } = await supabase
        .from("anpr_events")
        .select("id")
        .eq("plate_number", normalizedPlate)
        .gte("event_time", new Date(Date.now() - 30000).toISOString())
        .maybeSingle();

      if (recentEvent) {
        console.log(`Skipping duplicate detection for ${normalizedPlate}`);
        results.push({ plate_number: normalizedPlate, status: "duplicate", message: "Recently detected" });
        continue;
      }

      // Match against vehicles
      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("*")
        .ilike("vehicle_number", `%${normalizedPlate}%`);

      const matchedVehicle = vehicles && vehicles.length > 0 ? vehicles[0] : null;
      let matchStatus = "unmatched";

      if (matchedVehicle) {
        matchStatus = "matched";

        // Auto check-in/out for all matched vehicles
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
            .update({ status: "checked_out", check_out_time: new Date().toISOString() })
            .eq("id", matchedVehicle.id);
          matchStatus = "auto_checked_out";
        } else {
          // Auto check-in
          await supabase.from("vehicle_entries").insert({
            vehicle_id: matchedVehicle.id,
            gate_id: gate_id,
            location_id: gate.location_id,
            entry_time: new Date().toISOString(),
            purpose: "ANPR auto entry",
          });
          await supabase
            .from("vehicles")
            .update({ status: "checked_in", check_in_time: new Date().toISOString(), check_out_time: null })
            .eq("id", matchedVehicle.id);
          matchStatus = "auto_checked_in";
        }
      }

      // Log the event
      const { data: event } = await supabase
        .from("anpr_events")
        .insert({
          plate_number: normalizedPlate,
          gate_id,
          location_id: gate.location_id,
          matched_vehicle_id: matchedVehicle?.id || null,
          match_status: matchStatus,
          event_time: new Date().toISOString(),
        })
        .select()
        .single();

      results.push({
        plate_number: normalizedPlate,
        confidence: plate.confidence,
        status: matchStatus,
        vehicle: matchedVehicle ? {
          id: matchedVehicle.id,
          vehicle_number: matchedVehicle.vehicle_number,
          driver_name: matchedVehicle.driver_name,
        } : null,
        event_id: event?.id,
      });
    }

    return new Response(
      JSON.stringify({ success: true, plates: results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("ANPR scan error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
