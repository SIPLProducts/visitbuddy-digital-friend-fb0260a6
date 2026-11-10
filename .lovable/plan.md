# Update the VisiGuard Visitor Privacy Notice

## Goal
Replace the current single privacy acknowledgement with the requested notice and four independently required acknowledgements in both staff registration and public self-service. Keep signatures, NDA and safety declarations, and all other visitor workflows intact.

## What will change
- Create a new immutable, versioned privacy-notice record rather than editing the existing notice. Its English content will use the exact notice, four checkbox statements, and policy/terms URLs from your request. Both links will open in a new tab.
- Show four unchecked, independent checkboxes. Registration stays blocked until all four are checked and the existing signature is confirmed.
- Use the same notice and validation in `NewVisitor.tsx` and `SelfService.tsx`. Keep the existing signature pad and server-side capture flow.
- Extend the existing `visitor_agreements` record; do not create a second agreement table. Save the exact presented text/link snapshot, notice ID/version/language, four separate acknowledgement values and server-generated timestamps, and the existing signature evidence together.
- Have the trusted capture function load the notice text from the database and reject missing acknowledgements. The browser will not be trusted to supply the legal wording or version.
- Keep NDA and safety declarations separate and preserve their current display/reporting behavior.
- Prepare drafts for the other 12 supported languages, clearly marked inactive until reviewed and approved. They will not be presented as approved legal translations or activated before approval.

## Proposed database migration (review only; not executed)
Use additive nullable columns on the existing tables; preserve historical rows and all existing visitor data. No agreement table, existing column, or record will be dropped or rewritten.

- `public.dpdp_privacy_notices`: add four acknowledgement-text fields and policy/terms URL fields so each immutable notice version contains its own exact language-specific copy and links.
- `public.visitor_agreements`: add four nullable acknowledgement booleans and four nullable `timestamptz` acknowledgement timestamps. Existing `notice_id`, `notice_version`, `notice_language`, `agreement_text`, `acknowledged`, signature hash/path, and `signed_at` remain in use.
- Existing notice/agreement RLS and immutability protections remain in place. Only the server-side capture function inserts signed agreement evidence; no anonymous signature reads or client-side agreement writes are added.
- New notice versions are inserted as inactive. Activation is a separate authorized action after legal review and translation approval.

## Implementation phases
1. **Finalize notice content:** stage the exact English copy and URLs; create draft translations for review. Obtain organizational/legal confirmation before activating any version.
2. **Database and trusted capture:** after approval, apply the additive migration in an isolated development/staging backend, then update the capture function to snapshot all four acknowledgements and server timestamps.
3. **Registration screens:** update the shared notice panel and both registration flows; leave all boxes unchecked and block submission until all acknowledgements and signature are complete.
4. **Validation:** test desktop and touch interaction, language/version changes, anonymous and staff submission, saved snapshots, server timestamps, rejected incomplete submissions, and inability to replace an existing signature. Regression-check NDA, safety declarations, and compliance reporting.
5. **Release gate:** report test evidence and outstanding legal/translation items. Do not activate notices or deploy to production until you explicitly approve that release.

## Environment and safety constraint
The current project context indicates preview and published experiences share the same Lovable Cloud backend. Therefore, a database migration cannot be treated as staging-only here. No migration, notice activation, production deployment, or data cleanup will occur without a confirmed isolated staging backend or your explicit approval for the shared environment and separate production release approval.

## Technical details
- Existing schema inspection confirms `dpdp_privacy_notices` already stores language, version, title/body, active state and approval metadata. `visitor_agreements` already stores the notice snapshot fields, signature reference/hash, acknowledgement flag and signed timestamp; it has no per-checkbox fields today.
- The current notice lookup supports location/language selection with English fallback. The update will keep location scoping and ensure the submitted version still matches the active server-side notice.
- The current active English notice is labeled `v1.0-draft`; the new notice will be a separate version, not an in-place edit. Legal text and translations remain subject to your review; this technical workflow does not itself establish legal compliance.
