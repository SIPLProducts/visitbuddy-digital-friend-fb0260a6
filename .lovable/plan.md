## SMS Striker on visitor approval — already in place

The exact integration you described is already implemented in `supabase/functions/approve-visitor/index.ts` (lines 484–566). No code changes are required.

### What is already wired

**Endpoint & headers**
- `POST https://www.smsstriker.com/API/sendsmsapi.php`
- `Content-Type: application/json`

**Payload**
```json
{
  "key": "<SMS_STRIKER_KEY secret>",
  "from": "RESUST",
  "to": "91XXXXXXXXXX",
  "msg": "<rendered template>",
  "type": "1"
}
```

**Variable mapping (rendered into the DLT template)**
| Var | Source | Fallback |
|-----|--------|----------|
| var1 | `visitor.name` | "Visitor" |
| var2 | `visitor.company` | "Guest" |
| var3 | Visit date `dd/MM/yyyy` (Asia/Kolkata) | — |
| var4 | `visitor.gate.name` (Entry Gate) | "Main Gate" |
| var5 | `https://visiguard.sharvisoftwareservices.com/visitor/{visitor_id}` (QR link as URL) | — |
| var6 | `visitor.host.name` | "Host" |
| var7 | `visitor.department.name` | "NA" |

Rendered text (exact DLT wording, spacing, punctuation preserved):
```
Dear {var1}, Your visitor access for {var2} is confirmed on {var3} at {var4}. QR Link: {var5} Host: {var6} FROM {var7} Regards: RE SUSTAINABILITY LIMITED
```

**Phone normalization** — accepts `7013584342` or `917013584342`, strips spaces/`+`/`-`/leading zeros, rejects invalid numbers with a log line.

**Trigger** — fires immediately when host approves a visitor (status → `scheduled`).

**Secret** — `SMS_STRIKER_KEY` is already configured in Lovable Cloud.

**Logging** — payload (key omitted), HTTP status, and provider response are logged for every send.

### Action

Redeploy the `approve-visitor` edge function and approve a test visitor to confirm via function logs. I can run the redeploy as soon as you approve this plan.

### One small confirmation

Your spec listed `var4 = Entry Gate` — that's what the function does today, rendering as `"...on 18/05/2026 at Main Gate"`. If you actually intended `var4 = visit time` (e.g. `10:30`) and the gate belongs in a different slot, tell me and I'll swap it; otherwise I'll leave the mapping exactly as above.
