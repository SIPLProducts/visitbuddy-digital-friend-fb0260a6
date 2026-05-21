# Add Transfer Approval Option

Today, the host approval email has only **Approve** and **Reject**. We'll add a third action: **Transfer**, letting the host hand off the approval to another host at the same location. The new host receives a fresh approval email and is the one who must approve/reject.

## User flow

1. Host receives approval email with three buttons: ✅ Approve, ❌ Reject, 🔁 Transfer.
2. Clicking **Transfer** opens a public page (`/transfer-approval?id=<visitorId>`).
3. The page shows visitor details and a searchable dropdown of other hosts at the visitor's location (employees where `is_host = true`, same `location_id`, excluding current host).
4. Host picks a new host → clicks **Transfer Approval**.
5. Backend updates `visitors.host_id` to the new host and sends a fresh approval email/WhatsApp to that new host. Visitor status stays `pending_approval`.
6. Original host sees a confirmation screen: "Approval transferred to {name}".
7. The new host's email contains the same three buttons and can also transfer again if needed.

## Pieces to build

### 1. Edge function: `transfer-visitor-approval` (new, public, no JWT)
- Input: `{ visitorId, newHostId }` — validated with Zod.
- Loads visitor with service role; confirms `status = 'pending_approval'`.
- Verifies `newHostId` is an employee with `is_host = true` at the same `location_id` as the visitor's gate.
- Updates `visitors.host_id = newHostId` (keeps `pending_approval`).
- Inserts an `audit_logs` row (`action: 'visitor_approval_transferred'`, details include previous and new host).
- Invokes existing `notify-host` function with `{ visitorId, force: true }` so the new host gets the standard approval email + WhatsApp.
- Returns `{ success, newHostName }`.

### 2. Public page: `src/pages/TransferApproval.tsx` (new route)
- Reads `?id=` from query.
- Public reads: visitors, employees, gates, locations all already allow public SELECT — no auth needed.
- Fetches visitor (name, company, current host name, gate → location_id).
- Fetches eligible hosts: `employees` where `location_id = visitorLocationId AND is_host = true AND id != currentHostId`, ordered by name. Searchable combobox (reuse pattern from `HostCombobox`).
- Submit → calls `supabase.functions.invoke('transfer-visitor-approval', ...)`.
- Success screen with the new host's name; error screen for invalid/already-processed visitor (status not pending).
- Branded like `ApproveVisitor.tsx` (RE Sustainability card, logo).

Add route `/transfer-approval` in `src/App.tsx`.

### 3. Update `notify-host` email template
- Add a third button **🔁 Transfer to Another Host** linking to `${publicUrl}/transfer-approval?id=${visitor.id}`.
- Update the WhatsApp message builder to include a Transfer line alongside Approve/Reject.

### 4. Audit logging
Use existing `audit_logs` table (no schema change). Entry on every transfer for traceability.

## What is intentionally NOT changed

- No DB schema migration. `visitors.host_id` is reused; transfer history lives in `audit_logs`.
- No change to the in-app dashboard `PendingApprovals` component (transfer is an email-flow action; could be added later if you want it in-app too — let me know).
- Reject/approve flows untouched.
- No limit on number of transfers.

## Files

- New: `supabase/functions/transfer-visitor-approval/index.ts`
- New: `src/pages/TransferApproval.tsx`
- Edit: `src/App.tsx` (add route)
- Edit: `supabase/functions/notify-host/index.ts` (add Transfer button + WhatsApp line)
