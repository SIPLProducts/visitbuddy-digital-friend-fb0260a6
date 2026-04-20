// WhatsApp Web bridge proxy (DEMO ONLY)
// Forwards requests from the Lovable app to a self-hosted whatsapp-web.js bridge.
// The bridge URL + API key live in project secrets so the browser never sees them.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Action = "qr" | "status" | "send" | "logout";

interface BridgeRequest {
  action: Action;
  phone?: string;
  message?: string;
  mediaUrl?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const bridgeUrl = Deno.env.get("WHATSAPP_BRIDGE_URL");
  const apiKey = Deno.env.get("WHATSAPP_BRIDGE_API_KEY");

  if (!bridgeUrl || !apiKey) {
    return json(
      {
        error:
          "WhatsApp Web bridge is not configured. Set WHATSAPP_BRIDGE_URL and WHATSAPP_BRIDGE_API_KEY secrets.",
      },
      503,
    );
  }

  let body: BridgeRequest;
  try {
    body = (await req.json()) as BridgeRequest;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const action = body.action;
  if (!action || !["qr", "status", "send", "logout"].includes(action)) {
    return json({ error: "Invalid action" }, 400);
  }

  const base = bridgeUrl.replace(/\/+$/, "");
  const headers: Record<string, string> = {
    "x-api-key": apiKey,
    "Content-Type": "application/json",
  };

  try {
    let upstream: Response;
    if (action === "qr" || action === "status") {
      upstream = await fetch(`${base}/${action}`, { headers });
    } else if (action === "send") {
      if (!body.phone || !body.message) {
        return json({ error: "phone and message are required" }, 400);
      }
      upstream = await fetch(`${base}/send`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          phone: body.phone,
          message: body.message,
          mediaUrl: body.mediaUrl ?? null,
        }),
      });
    } else {
      // logout
      upstream = await fetch(`${base}/logout`, { method: "POST", headers });
    }

    const text = await upstream.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    return json(data, upstream.status);
  } catch (e) {
    console.error("whatsapp-bridge proxy error", e);
    return json(
      { error: "Bridge unreachable", details: (e as Error).message },
      502,
    );
  }
});
