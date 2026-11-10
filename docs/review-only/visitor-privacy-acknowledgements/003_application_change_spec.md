# Application code changes — review draft (not active)

This file specifies proposed edits. It is outside `src/` and `supabase/functions/`, so it is neither compiled into the app nor deployed.

## Shared notice panel (`src/components/shared/DpdpNoticeSignature.tsx`)

- Extend the fetched notice fields with `acknowledgement_1_text` through `_4_text`, `privacy_policy_url`, and `terms_of_service_url`.
- Replace the current single `acknowledged: boolean` with:

```ts
export interface DpdpCaptureState {
  noticeId: string | null;
  acknowledgements: [boolean, boolean, boolean, boolean];
  signature: string | null;
}
```

- Initialize the four checks to `[false, false, false, false]`; never use a default checked value.
- Render the notice copy followed by four independent Shadcn `Checkbox` controls. The labels come from the active notice record, not from editable frontend constants. Render links as new-tab anchors with `rel="noopener noreferrer"`.
- Require all four checks before enabling the existing signature pad. A notice ID/version/language/location change clears every check and signature so the visitor reviews and signs the exact selected copy.
- In the UI state callback, report the notice ID, four booleans and confirmed signature. A checked state is not itself proof until the server accepts the capture.

## Staff/public submit gates

In `NewVisitor.tsx` and `SelfService.tsx`, replace the one-acknowledgement check with a shared predicate that requires `acknowledgements.every(Boolean)`, a current notice ID, and the existing confirmed signature. Keep current registration logic, fields, NDA/safety workflows, and notifications otherwise unchanged. Send the four values explicitly as `acknowledgements: [true, true, true, true]`; do not send notice wording or a client-supplied timestamp.

## Trusted capture function (`supabase/functions/capture-visitor-signature/index.ts`)

Proposed request contract for each mode:

```ts
acknowledgements: z.tuple([
  z.literal(true), z.literal(true), z.literal(true), z.literal(true),
]),
```

After existing caller, rate-limit, visitor/location and signature checks, fetch from `dpdp_privacy_notices` the selected ID, location, language, version, title/body, all four acknowledgement strings and both URLs. Reject the request unless the notice is active, matches the visitor location or global scope, and has all required copy/URL values. The existing client-provided `notice_id` is only a selector; its text/version/language is never trusted.

Create one server timestamp (`new Date().toISOString()`) only after all validation passes. Insert the exact database notice and acknowledgement snapshot into the existing `visitor_agreements` row, set all four booleans true, and populate the four timestamp fields from that server timestamp. Keep the existing signature file upload, server-side SHA-256, immutability protections, private bucket, staff location authorization, self-service allowlist, compensating cleanup and notifications. Never update or replace an existing signed agreement.

The saved `agreement_text` snapshot should include the exact notice heading/body, the four exact acknowledgement labels, and the two displayed URL values. Keep the existing `notice_id`, `notice_version`, `notice_language`, `acknowledged`, `storage_path`, checksum and signature timestamp fields populated as before.

## Translation drafts

Use `translations.draft.json` only to seed inactive review copies after migration approval. It contains the exact English user-provided copy and drafts for the 12 other supported locales. No non-English draft should be marked approved or active without authorized review.

## Required regression checks (not run because no application code was changed)

1. Both staff and self-service show four unchecked boxes and two correct links opening new tabs.
2. Each check toggles independently; missing even one disables the signature/submit path.
3. A completed signature and all four checks submit through existing flows.
4. The capture function rejects any false/missing acknowledgement, inactive/wrong-location notice, and invalid signature; no agreement/file remains after a partial failure.
5. Read back the notice text, all four labels/values, notice version/language and four server timestamps for a valid staging submission.
6. Change language/location after entering checks: all are reset and the exact new version is shown.
7. Existing NDA, safety declaration, ComplianceReport NDA metrics, visitor creation, host notifications and signature evidence remain unchanged.
8. Verify no anonymous signature/agreement reads and no direct browser agreement writes.
