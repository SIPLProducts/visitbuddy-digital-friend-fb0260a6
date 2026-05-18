## Update SMS Striker integration in `approve-visitor` edge function

Align the SMS sent on host approval with the client's DLT-approved template and number format.

### Changes in `supabase/functions/approve-visitor/index.ts`

1. **Phone normalization → `91XXXXXXXXXX`**
   - Strip all non-digits.
   - Strip leading zeros.
   - If 10 digits → prepend `91`.
   - If already 12 digits starting with `91` → keep as-is.
   - Reject anything else with a clear log line (no send).
   - Remove the current `.slice(-10)` / country-code stripping logic.

2. **Exact DLT template wording** (no spaces/punctuation altered)
   ```
   Dear {var1}, Your visitor access for {var2} is confirmed on {var3} at {var4}. QR Link: {var5} Host: {var6} FROM {var7} Regards: RE SUSTAINABILITY LIMITED
   ```
   Built via simple string concatenation matching the template exactly (no truncation/`cap()` that could alter punctuation spacing).

3. **Variable mapping with safe fallbacks** (never null/undefined, never empty)
   - var1 = `visitor.name` → fallback `"Visitor"`
   - var2 = `visitor.company` → fallback `"Guest"`
   - var3 = visit date in `dd/MM/yyyy` (Asia/Kolkata)
   - var4 = `visitor.gate.name` → fallback `"Main Gate"`
   - var5 = `https://visiguard.sharvisoftwareservices.com/visitor/${visitor.visitor_id}`
   - var6 = `visitor.host.name` → fallback `"Host"`
   - var7 = `visitor.department.name` → fallback `"NA"`
   - All values `String(...).trim()`; replace empty with fallback.

4. **POST payload** (unchanged shape, confirmed working in Postman)
   ```json
   {
     "key": "<SMS_STRIKER_KEY>",
     "from": "RESUST",
     "to": "91XXXXXXXXXX",
     "msg": "<rendered template>",
     "type": "1"
   }
   ```
   - URL: `https://www.smsstriker.com/API/sendsmsapi.php`
   - Header: `Content-Type: application/json`

5. **Logging**
   - Before send: `console.log("SMS Striker payload:", { to, from, type, msg, msgLen })` (key omitted).
   - After send: `console.log("SMS Striker response:", { httpStatus, body })`.
   - Keep existing `accepted` parsing and `smsSent`/`smsSid` return fields.

6. **Trigger point** — unchanged. SMS is already sent immediately after `status` is updated to `scheduled` on host approval.

7. **Redeploy** the `approve-visitor` edge function after the edit.

### Out of scope
- WhatsApp body, email body, and QR image URL for WhatsApp/email remain unchanged.
- No DB/schema changes.
- No frontend changes.
