## Why the SMS doesn't land (even though SMS Striker returns success)

The Postman request and our edge function both POST the same JSON to `https://www.smsstriker.com/API/sendsmsapi.php` and both get `statusCode: 200, "Messages has been sent."`.

The only real difference is the `msg` content:

- **Postman (delivered):** ~180 chars, short fake URL `https:visitlink`
- **Edge function (not delivered):** **455 chars**, contains `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=<huge URL-encoded JSON>` with `{`, `}`, `?`, `&`, `=`

DLT (Indian SMS regulator) checks every message against the registered template on the operator side. The provider accepts the API call but the operator drops the SMS when:
- the body is much longer than the registered template, or
- the URL doesn't match the registered `{#var#}` URL pattern (query string with `?` `&` `=` `{` `}` is a common rejection cause).

So this is **not a code bug** in the API call — it's a message-content mismatch.

## Fix

Update `supabase/functions/approve-visitor/index.ts` SMS Striker block only:

1. **Use a short, clean link instead of the giant qrserver URL.**
   Send the visitor to a public approval/QR landing page that already exists:
   ```
   https://visiguard.sharvisoftwareservices.com/visitor/<visitor_id>
   ```
   (or whatever short URL maps to the visitor's QR — we can use the public `SelfService` style route). No `?`, no `&`, no `=`.

2. **Trim the SMS body to match a DLT-friendly template.** Target ~200 chars:
   ```
   Dear {name}, Your visitor access for {company} is confirmed on {date} at {gate}. QR Link: {short_url} Host: {host} FROM {dept} Regards: RE SUSTAINABILITY LIMITED
   ```
   - Strip the long weekday/year format for `currentDate` (use `dd-MM-yyyy` → ~10 chars instead of ~30).
   - Cap `company`, `gate`, `host`, `dept` at e.g. 30 chars each to stay inside the DLT length.

3. **Log the final `msgLen` and `accepted` flag** (already there) so we can verify the new length is ≪ 455.

4. **No changes** to WhatsApp, email, or any other code path. Twilio WhatsApp already works.

5. **Deploy `approve-visitor`** and re-test by approving a visitor — confirm SMS now lands on the phone.

## What I will NOT change

- SMS Striker URL, headers, JSON shape, key, `from=RESUST`, `type=1` — all already match Postman.
- The QR image itself in WhatsApp / Email — those don't have DLT limits.

## Confirm before I implement

- Is the public short URL `https://visiguard.sharvisoftwareservices.com/visitor/<visitor_id>` correct, or do you want a different short link (e.g. `/q/<id>`)? Once you confirm, I'll update the function, deploy it, and you can re-test approval.
