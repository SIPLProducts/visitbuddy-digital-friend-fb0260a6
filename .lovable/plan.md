

## Permanently fix the QR scan flow so it never says “Visitor not found” after recognizing the visitor name

### What is actually happening
The scanner shows the toast:
```text
QR scanned: <visitor name>
```
before any database lookup happens.

So when you see:
1. visitor name detected
2. then “Visitor not found”

that means the QR payload was read successfully, but the app failed in the lookup/handling step afterward.

### Root causes found

#### 1. The scan handler still does a risky UUID-first lookup
In `src/pages/CheckInOut.tsx`, `handleQrScan(...)` always tries:
```ts
.eq('id', data.visitorId)
```
first, then falls back to:
```ts
.eq('visitor_id', data.visitorId)
```

That is unsafe because many badge QRs use the human-readable ID like:
```text
VIS-XXXX-YYYY
```
not the UUID. Those should be looked up directly by `visitor_id`, not by `id` first.

#### 2. WhatsApp badge QR is still incomplete
`supabase/functions/send-whatsapp-badge/index.ts` currently builds QR JSON like:
```json
{ "visitorId": "VIS-...", "name": "...", "timestamp": "..." }
```
It is missing:
```json
"action": "checkout"
```

So checkout QRs sent through WhatsApp are ambiguous and the app has to guess what to do.

#### 3. The scanner can fire more than once for the same QR before fully stopping
In `src/components/checkin/QrScanner.tsx`, the callback calls:
```ts
onScan(data);
stopScanning();
```
but there is no duplicate-scan guard. On some devices, the same QR can be decoded again during shutdown. That can produce:
- first call finds the visitor
- second call races or resolves differently
- user sees conflicting toasts like “QR scanned” and then “Visitor not found”

This matches your symptom very closely.

---

## Permanent implementation

### 1. Make visitor lookup ID-format aware
Update `src/pages/CheckInOut.tsx` so `handleQrScan(...)`:

- checks whether `data.visitorId` is a UUID
- if it looks like UUID → query `visitors.id`
- otherwise → query `visitors.visitor_id`
- use `.maybeSingle()` only
- handle query errors explicitly instead of falling through to generic “Visitor not found”

Example behavior:
```ts
const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.visitorId);
const lookupColumn = looksLikeUuid ? 'id' : 'visitor_id';
```

This removes the fragile UUID-first fallback logic.

### 2. Make action handling resilient
Still in `src/pages/CheckInOut.tsx`, update the scan logic so it does not depend only on `data.action`.

Rules:
- `action === 'checkin'` → scheduled visitor goes to check-in flow
- `action === 'checkout'` → checked-in visitor is checked out
- if `action` is missing:
  - scheduled visitor → treat as check-in QR
  - checked-in visitor → treat as checkout QR
- pending approval → show friendly approval warning
- checked out → show already checked out warning

This ensures even older QRs keep working.

### 3. Add duplicate-scan protection in the scanner
Update `src/components/checkin/QrScanner.tsx` so once one QR is accepted, further decodes are ignored until cleanup completes.

Add a ref like:
```ts
const hasHandledScanRef = useRef(false);
```

Then:
- reset it when starting a new scan session
- set it to `true` immediately before calling `onScan(data)`
- ignore any later decode callbacks while it is true
- also reset properly on stop/cleanup

This prevents back-to-back duplicate processing from the same QR.

### 4. Fix the WhatsApp badge payload
Update `supabase/functions/send-whatsapp-badge/index.ts` so badge QR JSON includes:
```json
{
  "visitorId": "...",
  "name": "...",
  "action": "checkout",
  "timestamp": "..."
}
```

That makes WhatsApp checkout badges explicit and consistent with printed/email badge formats.

### 5. Keep vehicle QR flow isolated
`src/pages/VehicleGate.tsx` uses `visitorId` as a vehicle pass ID. Leave its business logic separate, but harden it similarly if needed later. This visitor fix should not break vehicle scanning.

---

## Files to update

- `src/pages/CheckInOut.tsx`
  - replace UUID-first/fallback lookup with format-aware lookup
  - improve action inference
  - improve error toasts
- `src/components/checkin/QrScanner.tsx`
  - add one-scan-per-session guard to prevent duplicate callbacks
- `supabase/functions/send-whatsapp-badge/index.ts`
  - include `action: 'checkout'` in QR payload

### Optional consistency update
- `supabase/functions/send-vehicle-whatsapp/index.ts`
  - add an explicit action field if vehicle passes should also support future scan-state logic consistently

---

## Expected result after the fix

### Check-in QR
Approval QR from the approval flow:
```json
{ "visitorId": "<uuid>", "name": "...", "action": "checkin" }
```
will always:
- find the visitor by `id`
- open the check-in flow
- never fall into “Visitor not found”

### Checkout QR
Printed / email / WhatsApp badge QR:
```json
{ "visitorId": "VIS-...", "name": "...", "action": "checkout" }
```
will always:
- find the visitor by `visitor_id`
- check out the visitor if status is `checked_in`
- never fail because of UUID mismatch

### Duplicate scan case
If the camera decodes the same QR twice in rapid succession:
- only the first decode is processed
- the second one is ignored
- no conflicting “Visitor not found” toast appears afterward

---

## Verification

```text
1. Approve a visitor.
   → Visitor gets check-in QR.
   → Scan it.
   → Toast shows QR scanned once.
   → Visitor opens check-in/photo flow.
   → No “Visitor not found”.

2. Complete check-in.
   → Visitor gets checkout QR by WhatsApp/email/SMS.

3. Scan the checkout QR from WhatsApp.
   → Visitor is found.
   → Status changes to checked_out.
   → No “Visitor not found”.

4. Scan a printed badge QR with VIS-... format.
   → Visitor is found by visitor_id.
   → Checkout works.

5. Scan the same QR twice quickly.
   → Only one action runs.
   → No second erroneous toast.

6. Scan a pending-approval visitor QR.
   → Friendly warning:
     “This visitor is still awaiting host approval.”
```

## Out of scope

- Email header color changes
- Vehicle gate workflow redesign
- Camera hardware/browser permission logic
- Twilio delivery failures unrelated to QR content

