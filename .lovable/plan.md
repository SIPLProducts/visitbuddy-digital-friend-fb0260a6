## Problem

In the approval SMS, the gate currently shows as `Main Entry` (the hardcoded fallback) instead of the actual gate the user picked in the registration dropdown. The dropdown shows the gate as `Name — Building` (e.g. `Gate 1 — Admin Block`), but the SMS only ever falls back because either the gate name isn't being composed with its building, or `visitor.gate?.name` is empty.

## Fix

Update `supabase/functions/approve-visitor/index.ts` (the only function that actually sends the approval SMS — `send-sms-badge` is no longer invoked post‑check‑in):

1. Build the gate label the same way the dropdown does:
   ```ts
   const gateNameOnly = (visitor.gate?.name ?? "").trim();
   const gateBuilding = (visitor.gate?.building ?? "").trim();
   const gateLabel = gateNameOnly
     ? (gateBuilding ? `${gateNameOnly} — ${gateBuilding}` : gateNameOnly)
     : "Main Entry";
   ```
2. Use `gateLabel` in the SMS Striker message instead of the current `pick(visitor.gate?.name, "Main Entry")`.
3. Keep the existing DLT template wording and length budget — only the substituted value changes (note: SMS Striker counts characters; long building names could push past 160 chars, but the DLT variable itself is free‑form so it stays compliant).

No DB, RLS, or frontend changes required. WhatsApp/email already include the full gate name and stay untouched.

## Files changed

- `supabase/functions/approve-visitor/index.ts` — compose `gateLabel` from `name` + `building` and use it in the SMS body.

## Deploy

Redeploy the `approve-visitor` edge function after the change.
