## Goal
The host approval link opens a page titled "VisiGuard" (shown in the screenshot at `vms.resustainability.com/approve-visitor`). Change that title to **Re Sustainability** so the host-facing approval flow matches the company brand.

## Change
**File: `src/pages/ApproveVisitor.tsx`** (line 271)
- `<CardTitle className="text-lg">VisiGuard</CardTitle>` → `<CardTitle className="text-lg">Re Sustainability</CardTitle>`

## Notes
- The email body itself (sent by the `notify-host` edge function) already renders the company name as **Re Sustainability** — it explicitly maps the legacy `VisiGuard` tenant setting to `Re Sustainability` via `getBranding()` (line 62). No edge-function change needed.
- Only the approval landing page header still shows "VisiGuard"; this fix updates it to match.
- The subtitle "Visitor Approval System" stays as-is (descriptive, not branding).