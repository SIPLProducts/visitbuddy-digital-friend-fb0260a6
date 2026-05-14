// Router for self-hosted Supabase edge-runtime.
// The container starts with `--main-service /home/deno/functions/main`
// and expects this file to dispatch /functions/v1/<name> requests
// to the matching function folder via EdgeRuntime.userWorkers.
//
// Functions listed in NO_VERIFY_JWT (matches supabase/config.toml
// `verify_jwt = false` entries) are served without JWT verification.

// deno-lint-ignore no-explicit-any
declare const EdgeRuntime: any;

const NO_VERIFY_JWT = new Set<string>([
  "send-whatsapp-badge",
  "send-vehicle-whatsapp",
  "notify-host",
  "send-email-badge",
  "approve-visitor",
  "send-sms-badge",
  "anpr-webhook",
  "camera-proxy",
  "anpr-scan",
  "bulk-create-employee-users",
  "test-email",
  "test-smtp",
  "whatsapp-bridge",
  "send-pending-approval-reminders",
]);

// Default to NOT verifying JWT globally — individual functions still
// validate the caller's auth header in code where needed. This matches
// Lovable-managed deploy behavior.
const GLOBAL_VERIFY_JWT = (Deno.env.get("VERIFY_JWT") ?? "false") === "true";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // Health probe
  if (url.pathname === "/" || url.pathname === "/_internal/health") {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
    });
  }

  // Expect /<function-name>[/...]  (Kong strips /functions/v1)
  const parts = url.pathname.replace(/^\/+/, "").split("/");
  const functionName = parts[0];

  if (!functionName) {
    return new Response(
      JSON.stringify({ error: "missing function name in path" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const servicePath = `/home/deno/functions/${functionName}`;
  const verifyJwt = GLOBAL_VERIFY_JWT && !NO_VERIFY_JWT.has(functionName);

  try {
    const worker = await EdgeRuntime.userWorkers.create({
      servicePath,
      memoryLimitMb: 256,
      workerTimeoutMs: 5 * 60 * 1000,
      noModuleCache: false,
      importMapPath: null,
      envVars: Object.entries(Deno.env.toObject()),
      forceCreate: false,
      netAccessDisabled: false,
      cpuTimeSoftLimitMs: 10_000,
      cpuTimeHardLimitMs: 20_000,
      decoratorType: "typescript",
      verifyJwt,
    });

    return await worker.fetch(req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[main] failed to invoke "${functionName}":`, msg);

    if (msg.includes("not found") || msg.toLowerCase().includes("no such file")) {
      return new Response(
        JSON.stringify({ error: `function "${functionName}" not found` }),
        { status: 404, headers: { "content-type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "function boot failed", detail: msg }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
});