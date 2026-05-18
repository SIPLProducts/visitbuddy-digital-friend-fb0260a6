## SMS Striker on visitor approval — already aligned, redeploy

The current `supabase/functions/approve-visitor/index.ts` already implements exactly what you described. No code changes are needed — only a redeploy to be sure the latest version is live.

### What is already in place

**Endpoint & payload shape** (lines 523–535)
- URL: `https://www.smsstriker.com/API/sendsmsapi.php`
- Method: `POST`, Header: `Content-Type: application/json`
- Body:
  ```json
  {
    "key": "<SMS_STRIKER_KEY secret>",
    "from": "RESUST",
    "to": "91XXXXXXXXXX",
    "msg": "<rendered template>",
    "type": "1"
  }
  ```

**Phone normalization to `91XXXXXXXXXX`** (lines 492–499)
- Accepts `7013584342` → `917013584342`
- Accepts `917013584342` → kept as-is
- Strips spaces, dashes, `+`, leading zeros
- Invalid numbers logged and skipped

**DLT template — values substituted in place of `{#varN#}`** (line 517)
```
Dear {var1}, Your visitor access for {var2} is confirmed on {var3} at {var4}. QR Link: {var5} Host: {var6} FROM {var7} Regards: RE SUSTAINABILITY LIMITED
```
SMS Striker expects the final rendered text (it does not do server-side variable replacement on this API), so the function substitutes values directly while preserving exact wording, spacing, and punctuation.

**Variable mapping** (lines 506–514)
| Var  | Source | Fallback |
|------|--------|----------|
| var1 | `visitor.name` | "Visitor" |
| var2 | `visitor.company` | "Guest" |
| var3 | Visit date `dd/MM/yyyy` (Asia/Kolkata) | — |
| var4 | `visitor.gate.name` (Entry Gate) | "Main Gate" |
| var5 | `https://visiguard.sharvisoftwareservices.com/visitor/{visitor_id}` (QR link as URL) | — |
| var6 | `visitor.host.name` | "Host" |
| var7 | `visitor.department.name` | "NA" |

All values are `String(...).trim()`-ed; empty strings fall back so no `null`/`undefined` ever reaches the API.

**Trigger** — fires immediately after `visitors.status` is set to `scheduled` on host approval (line 309 → 484+).

**Logging** (lines 519–521, 537, 556–560)
- Pre-send: `SMS Striker payload:` with `to`, `from`, `type`, `msg`, `msgLen` (key omitted).
- Post-send: `SMS Striker response:` with `httpStatus` and raw body.
- Provider-level accept/reject parsed and logged.

### Action

Redeploy the `approve-visitor` edge function and approve a test visitor with phone `7013584342` (or `917013584342`) to confirm via function logs.

### Open question (optional)

Your initial message wrote the template as `"...on {#var3#} at {#var4#}"` with `var4 = Entry Gate`, which renders as `"...on 18/05/2026 at Main Gate"`. That is what the function currently produces. If the client actually intended `var4 = visit time` (e.g. `10:30`) and the gate name belongs elsewhere, tell me and I'll swap `var4` to a time field — but I'll only change it if you confirm, since it would diverge from the mapping you sent.
