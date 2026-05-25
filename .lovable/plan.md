## Root cause

SMS Striker returns `statusCode:200 / Messages has been sent`, but the operator drops the SMS because the body no longer matches the DLT-registered template under sender ID `RESUST`.

Three deviations vs the registered template you shared:

```
Dear Pradeep, Your visitor access for Sharvi infotech private limited is confirmed on 25/05/2026 at Main Gate(3609) ? Admin Building. QR Link: https://vms.resustainability.com/?d953ffa6 Host: Vishal Singh FROM BD(3609) safe to assembly point https://vms.resustainability.com/?s4ff34d Regards: RE SUSTAINABILITY LIMITED
```

| # | Registered | Currently sent |
|---|------------|----------------|
| 1 | QR Link `https://vms.resustainability.com/?<code>` | `https://vms.resustainability.com/s/<code>` |
| 2 | Safety URL `https://vms.resustainability.com/?s<code>` | `https://vms.resustainability.com/safety/<code>` |
| 3 | Gate separator `?` / `-` (ASCII) | `—` (em-dash, non-ASCII) |

## Fix

### 1. `supabase/functions/approve-visitor/index.ts` (SMS block, ~lines 484–662)

- Revert QR link to query-string form:
  ```ts
  const qrLink = shortCode
    ? `${smsBase}/?${shortCode}`
    : `${smsBase}/?${cleanUrlPart(visitor.visitor_id).toLowerCase().slice(0, 10)}`;
  ```
- Revert safety link to query-string form with `s` prefix:
  ```ts
  if (safetyCode) safetyLink = `${smsBase}/?s${safetyCode}`;
  ```
- Build gate label with ASCII `-` (hyphen), not `—`:
  ```ts
  const gateName = gateNameOnly
    ? (gateBuilding ? `${gateNameOnly} - ${gateBuilding}` : gateNameOnly)
    : "Main Entry";
  ```

### 2. `supabase/functions/send-sms-badge/index.ts`

Apply the identical three changes to the parallel block: `qrUrl`, `safetyLink`, and gate separator.

### 3. `src/App.tsx` — keep query-string routing working

Verify the existing `ClickRedirect`/`ShortLinkRedirect` route already resolves `/?<code>` (it was the original scheme before the path-based switch). If the `/s/<code>` path route is still present, leave it so old SMS links continue to work, but the **outgoing** template now uses `/?<code>`.

### 4. Deploy & verify

- `supabase--deploy_edge_functions` for `approve-visitor` and `send-sms-badge`.
- On the on-prem box, run `sudo bash deploy/restart-edge-functions.sh` after pulling the new code.
- Approve one test visitor; the log line `SMS Striker payload:` should now show:
  ```
  ...at Main Gate(3609) - Admin Building. QR Link: https://vms.resustainability.com/?<8char> Host: ... safe to assembly point https://vms.resustainability.com/?s<6char> Regards: ...
  ```
  byte-identical to the DLT template aside from the variable values.
- Within ~30s the visitor's phone should receive the SMS. Click the QR link in the message — it must land on the QR page (covered by existing query-string route fallback).

## Out of scope

- Email and WhatsApp flows — unchanged.
- Approve / reject / transfer routing fix from the previous task — unchanged.
- DLT registration itself — no portal work needed; we are matching the existing approved template.
