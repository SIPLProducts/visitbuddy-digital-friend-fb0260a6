## Problem

After a host transfers an approval, the new host's email contains Approve / Reject / Transfer buttons that link to `https://visiguard.sharvisoftwareservices.com/...` instead of the live tenant `https://vms.resustainability.com/...`.

## Root cause

`notify-host` builds approval links from `resolvePublicUrl(req, supabase)`, with this priority:

1. request `Origin` header
2. request `Referer` header
3. `tenant_settings.public_app_url`
4. `PUBLIC_URL` env var
5. `null`

When a user submits a transfer in the browser, `transfer-visitor-approval` runs with the correct browser `Origin` (`vms.resustainability.com`) — but it then invokes `notify-host` server-to-server via `supabase.functions.invoke(...)`, which sends **no Origin/Referer**. `notify-host` falls through to the next tier. On the deployed self-hosted backend we verified `tenant_settings.public_app_url IS NULL`, so it lands on the `PUBLIC_URL` env, which is set to the legacy Sharvi staging URL.

The original (non-transfer) `notify-host` path works because it's invoked directly from the browser with a real Origin.

## Fix

Forward the caller's origin into the secondary `notify-host` invocation, so transfer-triggered emails use the same host the browser is on. This restores parity with the non-transfer path and stays correct regardless of how the env / tenant_settings are configured on each deployment.

### Changes

1. **`supabase/functions/transfer-visitor-approval/index.ts`**
   - Capture `req.headers.get("origin")` (fallback `req.headers.get("referer")`) at the top of the handler.
   - When invoking `notify-host`, pass an explicit `headers: { origin }` option (and include `referer` if origin is missing) so `resolvePublicUrl` resolves to the live tenant.

   ```ts
   const callerOrigin = req.headers.get("origin") || req.headers.get("referer") || "";
   ...
   await supabase.functions.invoke("notify-host", {
     body: { visitorId, force: true },
     headers: callerOrigin ? { origin: callerOrigin } : undefined,
   });
   ```

2. **No changes** to `notify-host`, `approve-visitor`, frontend pages, RLS, DB schema, migrations, email templates, or the SMS QR-link flow shipped in the previous turn.

## Verification

After deploy, transfer an approval from the live tenant:

1. New host's email Approve / Reject / Transfer buttons resolve to `https://vms.resustainability.com/approve-visitor?...` and `.../transfer-approval?...`.
2. Clicking them lands on the actual approval pages, not the Sharvi staging domain.
3. Original (non-transfer) host emails still build the same URLs as before — unchanged.
