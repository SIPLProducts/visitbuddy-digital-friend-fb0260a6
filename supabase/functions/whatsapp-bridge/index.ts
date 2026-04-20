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
  timeoutMs?: number;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const truncate = (s: string, max = 500) =>
  s.length > max ? `${s.slice(0, max)}…[truncated ${s.length - max} chars]` : s;

const hostOf = (u: string) => {
  try { return new URL(u).host; } catch { return u; }
};

async function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const bridgeUrl = Deno.env.get("WHATSAPP_BRIDGE_URL");
  const apiKey = Deno.env.get("WHATSAPP_BRIDGE_API_KEY");

  if (!bridgeUrl || !apiKey) {
    console.error("[whatsapp-bridge] missing secrets", {
      hasUrl: !!bridgeUrl,
      hasKey: !!apiKey,
    });
    return json(
      {
        error:
          "WhatsApp Web bridge is not configured. Set WHATSAPP_BRIDGE_URL and WHATSAPP_BRIDGE_API_KEY secrets.",
        code: "unconfigured",
        details: { hasUrl: !!bridgeUrl, hasKey: !!apiKey },
      },
      503,
    );
  }

  let body: BridgeRequest;
  try {
    body = (await req.json()) as BridgeRequest;
  } catch {
    return json({ error: "Invalid JSON body", code: "bad_request" }, 400);
  }

  const action = body.action;
  if (!action || !["qr", "status", "send", "logout"].includes(action)) {
    return json({ error: "Invalid action", code: "bad_request" }, 400);
  }

  const base = bridgeUrl.replace(/\/+$/, "");
  const trailingSlash = bridgeUrl !== base;
  const headers: Record<string, string> = {
    "x-api-key": apiKey,
    "Content-Type": "application/json",
  };
  const timeoutMs = Math.min(Math.max(body.timeoutMs ?? 60_000, 5_000), 90_000);

  let upstreamUrl = `${base}/${action}`;
  console.log(`[whatsapp-bridge] → ${action}`, {
    host: hostOf(base),
    trailingSlash,
    timeoutMs,
  });

  try {
    let upstream: Response;
    if (action === "qr" || action === "status") {
      upstream = await fetchWithTimeout(upstreamUrl, { headers }, timeoutMs);
    } else if (action === "send") {
      if (!body.phone || !body.message) {
        return json(
          { error: "phone and message are required", code: "bad_request" },
          400,
        );
      }
      upstreamUrl = `${base}/send`;
      upstream = await fetchWithTimeout(
        upstreamUrl,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            phone: body.phone,
            message: body.message,
            mediaUrl: body.mediaUrl ?? null,
          }),
        },
        timeoutMs,
      );
    } else {
      upstreamUrl = `${base}/logout`;
      upstream = await fetchWithTimeout(
        upstreamUrl,
        { method: "POST", headers },
        timeoutMs,
      );
    }

    const text = await upstream.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    console.log(`[whatsapp-bridge] ← ${action} ${upstream.status}`, {
      host: hostOf(base),
      bodyPreview: truncate(text, 200),
    });

    if (!upstream.ok) {
      let code = "upstream_error";
      if (upstream.status === 401 || upstream.status === 403) code = "unauthorized";
      else if (upstream.status === 404) code = "not_found";
      else if (upstream.status >= 500) code = "upstream_5xx";
      return json(
        {
          error: `Bridge returned HTTP ${upstream.status}`,
          code,
          upstreamStatus: upstream.status,
          upstreamUrl,
          upstreamHost: hostOf(base),
          upstreamBody: truncate(text),
          trailingSlash,
          data,
        },
        502,
      );
    }

    return json(data, upstream.status);
  } catch (e) {
    const err = e as Error;
    const isAbort = err.name === "AbortError";
    const code = isAbort ? "timeout" : "unreachable";
    console.error(`[whatsapp-bridge] ✗ ${action} ${code}`, {
      host: hostOf(base),
      message: err.message,
    });
    return json(
      {
        error: isAbort
          ? `Bridge did not respond within ${timeoutMs}ms (likely cold start)`
          : "Bridge unreachable",
        code,
        upstreamUrl,
        upstreamHost: hostOf(base),
        details: err.message,
        trailingSlash,
        timeoutMs,
      },
      isAbort ? 504 : 502,
    );
  }
});
