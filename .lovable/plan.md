## Plan

1. **Keep SMS sending on host approval**
   - Continue using the existing `approve-visitor` backend function.
   - SMS will still be triggered immediately after the host clicks **Approve** and the visitor status becomes `scheduled`.

2. **Harden the SMS Striker payload**
   - Normalize visitor mobile numbers to exactly 10 digits.
   - If the number is invalid or missing, log a clear reason instead of silently skipping.
   - Send the payload in the SMS Striker format:

```json
{
  "key": "<secret>",
  "from": "RESUST",
  "to": "<visitor mobile>",
  "msg": "Dear <visitor>, Your visitor access for <company> is confirmed on <date> at <gate>. QR Link: <qr link> Host: <host> FROM <department> Regards: RE SUSTAINABILITY LIMITED",
  "type": "1"
}
```

3. **Improve SMS Striker response handling**
   - Parse the SMS Striker response JSON instead of treating any HTTP 200 as final success.
   - Mark `notifications.sms = true` only when SMS Striker returns `statusCode: 200`.
   - Return `smsSid` as the Job Id when available.
   - Return/log the provider message when it is rejected, failed, or malformed.

4. **Add safe debug logging**
   - Log the sanitized phone number, message length, and SMS Striker status.
   - Do **not** log the API key.
   - This will confirm whether the app sent the SMS correctly or whether the provider rejected/did not deliver it.

5. **Deploy and verify**
   - Deploy the updated `approve-visitor` function.
   - Test approval again and check function logs for `SMS Striker accepted` or the exact rejection reason.

## Expected result

After host approval, the visitor should receive the SMS if SMS Striker accepts and delivers the DLT-approved template. If it still does not reach the phone, the logs/API response will show whether it is a provider-side delivery issue such as DLT template mismatch, sender header issue, or operator rejection.