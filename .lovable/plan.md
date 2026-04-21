

## Make QR scan match on both ID columns + diagnose RLS-hidden visitors

### Root cause

The QR payload's `visitorId` field is **not** consistent across the codebase:

| Source | Encodes |
|---|---|
| `send-whatsapp-badge` (Twilio WhatsApp QR) | `visitor.visitor_id` (e.g. `VIS-D80467B8-474E`) |
| Printed badge (`PrintBadge.tsx`, `BadgePrinting.tsx`, `SafetyPermitBadge.tsx`) | `visitor.visitor_id` (VIS- code) |
| **`approve-visitor` edge function** (host approval email/WhatsApp) | `visitor.id` (**raw UUID**) |

Today's scanner picks the lookup column by regex: UUID-shape → `visitors.id`, otherwise → `visitors.visitor_id`. That handles the *format*, but it fails the moment any of the following happens:

1. The text decoded from the QR has a stray newline, lowercase chars, or the regex narrowly misses (e.g. an old badge where the JSON's `visitorId` was lowercased somewhere) → it queries the wrong column → row not found.
2. The visitor exists, but their `gate_id` belongs to a location the **current logged-in user is not assigned to**. RLS (`Users can view visitors at their locations`) silently filters the row out → looks identical to "not found".
3. The QR encodes a UUID-from-`approve-visitor` but the visitor row was later deleted/regenerated.

### Fix in `src/pages/CheckInOut.tsx` → `handleQrScan`

1. **Normalise the scanned text** before lookup: `trim()`, drop stray whitespace, and uppercase it only when it matches the `VIS-` shape (UUIDs stay lowercase to satisfy Postgres UUID parsing).
2. **Query both columns in one round-trip** using `.or()`:
   ```ts
   const cleaned = rawId.trim();
   const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleaned);
   const visIdCandidate = cleaned.toUpperCase();

   const filter = isUuid
     ? `id.eq.${cleaned},visitor_id.eq.${visIdCandidate}`
     : `visitor_id.eq.${visIdCandidate}`;

   const { data, error } = await supabase
     .from('visitors').select(selectClause).or(filter).maybeSingle();
   ```
   This means a UUID payload still finds the row even if the column shifted, and a `VIS-` payload survives lowercase drift.
3. **Distinguish RLS-hidden from truly-missing**: when the primary query returns no row, call the existing `approve-visitor` edge function (already runs as service role) with a new lightweight `mode: 'lookup'` branch that only returns `{ exists, location_id, gate_id, name }` — no mutation. If `exists === true`, surface a clearer toast:
   > *"This badge belongs to a different location. Switch to that location to scan it."*
   Otherwise keep the current "Visitor not found" message.
4. **Console-log the raw scanned string + chosen filter** for future field debugging.

### Edge function change

Extend `supabase/functions/approve-visitor/index.ts`:
- Accept `{ mode: 'lookup', visitorId }` (where `visitorId` may be UUID or VIS- code).
- Look up by `id` then by `visitor_id` using the service-role client (bypasses RLS).
- Return `{ exists: boolean, location_id, gate_id, name }`. No state changes. Same auth posture as today (it's already a public function used by approval links).

### Align future QR payloads

To stop the inconsistency at the source, change `approve-visitor` (lines 316-321) to encode `visitorId: visitor.visitor_id` instead of `visitor.id`, matching every other badge channel. Backwards compat is preserved by the new dual-column lookup above, so old in-flight WhatsApps issued today still scan correctly.

### Verification

```text
1. Approve a new visitor via the host-approval link → scan the WhatsApp badge.
   → Visitor matched, check-in dialog opens. No "Visitor not found".
2. Scan a printed badge (VIS- code). Same result.
3. Scan a badge issued for Location A while logged in as a Gate Security
   user assigned to Location B.
   → Toast: "This badge belongs to a different location…"
   → Console shows the lookup payload + the location id returned by the
     edge function.
4. Scan a deleted visitor's old badge.
   → Toast: "Visitor not found. The QR may be from a deleted record."
5. Existing flows (camera toggle, scan-once guard, checkout-by-QR) unchanged.
```

### Out of scope
- Changing QR image generator / qrserver.com URL.
- Reissuing badges for already-checked-in visitors.
- Gate-level role scoping (still location-level).
- ANPR scanning.

