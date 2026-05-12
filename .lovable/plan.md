## The issue (root cause)

Yes — the approval URL is effectively hardcoded. In `supabase/functions/notify-host/index.ts` line 373:

```ts
const publicUrl = Deno.env.get("PUBLIC_URL") || "https://visitbuddy-digital-friend.lovable.app";
```

The approve / reject links in the host email + WhatsApp + SMS are then built as:

```ts
`${publicUrl}/approve-visitor?id=${visitor.id}&action=approve`
```

So the link is whatever `PUBLIC_URL` was set to when the edge-functions container was started. On your on‑prem box that env var is currently set to `https://visiguard.sharvisoftwareservices.com` (left over from the earlier deploy), so every email — even ones triggered from `vms.resustainability.com` — points back to the old domain.

It is *not* hardcoded to `sharvisoftwareservices.com` in the source, but it *is* hardcoded into the running container's environment. That's why it doesn't follow the browser you registered the visitor from.

## Fix — make it dynamic, in priority order

The edge function will pick the first source that resolves to a non‑empty URL:

1. **Request `Origin` / `Referer` header** — whichever domain actually invoked the function (so registering from `vms.resustainability.com` produces links to `vms.resustainability.com`, and the same code on `visiguard.sharvisoftwareservices.com` produces links to that domain — automatically, with no env change).
2. **`tenant_settings.public_app_url`** column (new, optional) — lets an admin force a canonical domain from the Settings UI when emails/WhatsApp are triggered by a cron or webhook with no Origin header.
3. **`PUBLIC_URL` env var** — same as today, kept as a final fallback for server‑side jobs.
4. **Hardcoded lovable URL** — removed.

## Changes

### 1. `supabase/functions/notify-host/index.ts`
- Replace the single `publicUrl` line with a `resolvePublicUrl(req, supabase)` helper:
  - Read `Origin` header; if present and not the supabase functions host, normalize it (strip trailing slash) and use it.
  - Else read `Referer`, take its origin.
  - Else `select public_app_url from tenant_settings limit 1`.
  - Else `Deno.env.get("PUBLIC_URL")`.
  - Else throw a clear error (no silent fallback to a wrong domain).
- Use the resolved value for both the WhatsApp/SMS approve/reject links (around line 516, 519) and the email links (line 678, 679).

### 2. `supabase/functions/approve-visitor/index.ts`
- Apply the same `resolvePublicUrl` so the *post‑approval* badge email/WhatsApp also use the right domain. (Currently relies on the same kind of fallback.)

### 3. New DB column (optional override)
Migration:
```sql
alter table public.tenant_settings
  add column if not exists public_app_url text;
```
No RLS change needed (table already readable by admins).

### 4. Settings UI
In `src/pages/Settings.tsx` (General tab), add one input:
- Label: **Public app URL** (e.g. `https://vms.resustainability.com`)
- Helper text: "Used in approval links sent by email / WhatsApp / SMS when the system can't detect the browser domain (cron jobs, webhooks)."
- Persists to `tenant_settings.public_app_url`.

### 5. Frontend invocations
Where `supabase.functions.invoke('notify-host'|'approve-visitor', …)` is called from the browser, the SDK already sends `Origin` automatically — no client change needed. Confirmed call sites: `Visitors.tsx`, `PendingApprovals.tsx`, `CheckInOut.tsx`, `ApproveVisitor.tsx`, `NewVisitor.tsx`.

### 6. Operational note (no code, just for your on‑prem box)
After deploying these function changes, you can simply unset (or leave stale) `PUBLIC_URL` in `backend/supabase/docker/volumes/functions/.env` — the function will derive the domain from the request. If you prefer a hard override, set `PUBLIC_URL=https://vms.resustainability.com` and restart the `supabase-edge-functions` container.

## What this gives you

- Register on `vms.resustainability.com` → email link goes to `vms.resustainability.com/approve-visitor?...`
- Register on `visiguard.sharvisoftwareservices.com` → link goes there.
- Same code, no per‑deployment env edit required.
- Optional admin override in Settings for cron‑driven / headless flows.

## Out of scope
- No change to QR code generation in `GateQRCodes.tsx` (separate `VITE_PUBLIC_URL` build var, unrelated to email).
- No change to the User Management edge functions discussed earlier.
