

## Send the checkout QR on EVERY check-in path (scan, manual, photo, dialog)

### Why no checkout QR arrived this time
You checked in by **scanning the check-in QR** in the Scan tab. That path runs `handleQrScan` → it just flips the row to `checked_in` and refreshes the list — it never invokes `send-whatsapp-badge` / `send-email-badge` / `send-sms-badge`.

The earlier fix only added the badge dispatch to **`CheckInCaptureDialog`** (the dialog launched from the Visitors table). Three other check-in paths in `CheckInOut.tsx` still skip it:

| Where you checked in | Sends checkout QR today? |
|---|---|
| Visitors page → click Check In → CheckInCaptureDialog | ✅ yes (already fixed) |
| Check-In/Out page → Scan tab → scan QR (your case) | ❌ no |
| Check-In/Out page → Search → click "Check In" | ❌ no |
| Check-In/Out page → Search → "Check In with Photo" | ❌ no |

Same for visitor-creation and host-approval — those already work correctly:
- Create visitor → `notify-host` is invoked (host WhatsApp + email + visitor confirmation).
- Host approves → `approve-visitor` is invoked (visitor receives the **check-in QR**).
- Check-in → checkout QR should fire — broken on 3 of 4 paths.

### The fix — one shared helper + four call sites

**1. Add a small helper inside `src/pages/CheckInOut.tsx`** (mirrors what `CheckInCaptureDialog` already does):

```ts
const sendCheckoutBadges = async (visitorId: string) => {
  const { data: v } = await supabase
    .from('visitors')
    .select(`name, visitor_id, phone, email, company, purpose,
             host:employees(name), department:departments(name), gate:gates(name)`)
    .eq('id', visitorId)
    .maybeSingle();
  if (!v) return;

  const payload = {
    visitorName: v.name,
    visitorId: v.visitor_id,
    phone: v.phone || '',
    email: v.email || '',
    company: v.company || '',
    purpose: v.purpose || '',
    hostName: (v as any).host?.name || '',
    departmentName: (v as any).department?.name || '',
    gateName: (v as any).gate?.name || '',
  };

  const tasks: Promise<any>[] = [];
  if (payload.phone) {
    tasks.push(supabase.functions.invoke('send-whatsapp-badge', { body: payload }));
    tasks.push(supabase.functions.invoke('send-sms-badge',      { body: payload }));
  }
  if (payload.email) {
    tasks.push(supabase.functions.invoke('send-email-badge',    { body: payload }));
  }
  const results = await Promise.allSettled(tasks);
  const failed = results.filter(r => r.status === 'rejected').length;
  if (tasks.length === 0) return;
  if (failed === 0)            toast.success('Checkout QR sent via WhatsApp & email');
  else if (failed < tasks.length) toast.warning('Checkout QR sent partially — some channels failed');
  else                          toast.warning('Could not send checkout QR — please retry from visitor details');
};
```

**2. Call it (fire-and-forget) right after every successful check-in** in `CheckInOut.tsx`:

- **`handleQrScan`** — after the `status === 'scheduled'` branch's photo capture is *not* enabled, currently the scan opens the camera dialog. Move the badge dispatch into `handlePhotoCaptureAndCheckIn` (next bullet) so the QR goes out only after the photo step finishes.
  Additionally, when a `'checked_in'` visitor is scanned (already-checked-in), do nothing extra (already handled).
- **`handleCheckIn`** — after success toast: `sendCheckoutBadges(visitor.id);`
- **`handlePhotoCaptureAndCheckIn`** — after success toast: `sendCheckoutBadges(selectedVisitor.id);`
- **`handlePhotoCapture`** — leave as-is (this only attaches a photo to an already-checked-in visitor; status doesn't change, no second QR needed).

**3. No changes to `CheckInCaptureDialog`** (already wired). No changes to `approve-visitor`, `notify-host`, or the badge edge functions.

### Verifying the three notification stages stay consistent

After this fix, every visitor lifecycle event will reliably trigger messaging:

```
EVENT                       WHO RECEIVES                    CHANNELS
───────────────────────────  ──────────────────────────────  ──────────────────
Visitor created              Host (approve/reject)           WhatsApp + Email
                             Visitor (request submitted)     WhatsApp + Email
Host approves                Visitor (check-in QR)           WhatsApp + Email + SMS
Security checks visitor in   Visitor (checkout QR)           WhatsApp + Email + SMS
   ↳ via Visitors dialog       ✅ (already works)
   ↳ via Scan QR                ✅ (fix below)
   ↳ via Search → Check In      ✅ (fix below)
   ↳ via Search → Photo Check In ✅ (fix below)
Visitor scans checkout QR    (no message — flips status)
```

### Files touched
- **Edit** `src/pages/CheckInOut.tsx` only — add the `sendCheckoutBadges` helper, call it from `handleCheckIn` and `handlePhotoCaptureAndCheckIn` (and leave the QR-scan branch routing through the photo step that already exists).

No DB migrations, no edge function changes, no new secrets.

### What you'll do after the fix

```text
1. Create a fresh visitor (with phone + email).
   → Host inbox: approval email with Approve/Reject.
   → Host WhatsApp: same approval message.
   → Visitor: "Visit Request Submitted" (WhatsApp + email).

2. Tap Approve in WhatsApp.
   → Visitor: "Visit Approved — show this CHECK-IN QR" (WhatsApp + email).

3. At the gate, on Check-In/Out page → Scan tab → scan the visitor's check-in QR.
   → Camera dialog opens, capture photo.
   → Visitor row flips to checked_in, badge prints.
   → Visitor: "Checked In — use this QR to check out" (WhatsApp + email + SMS)
     ← THIS is the part that was missing.

4. Repeat with Search → Check In and Search → Check In with Photo to confirm
   the same checkout QR arrives on those paths too.

5. Visitor leaves and shows the checkout QR → status flips to checked_out.
```

### Out of scope
- Vehicle WhatsApp (`send-vehicle-whatsapp`) — separate function.
- The QR scanner library code — unchanged.
- Auto-checkout cron at 6 PM — unchanged.

