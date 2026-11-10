# Update Visitor Privacy Notice (4 declarations + links)

## What visitors will see
- Section 1 "Personal Data Collection and Processing" with your exact wording.
- Section 2 "Visitor Consent and Declaration" with four separate, unticked boxes (your exact text). Checkbox 4 links "Privacy Policy" (https://re.one/privacy-policy/) and "Terms of Service" (https://re.one/terms-of-service/), both opening in a new tab.
- The signature pad unlocks only after all four boxes are ticked; Submit stays blocked until all four plus a confirmed signature are done.
- Same step in staff "Pre-Register Visitor" and the public self check-in page. NDA and safety declaration steps are untouched. Layout stacks cleanly on phone, tablet and desktop.

## What gets recorded
For each registration, one existing signature record (no new agreement table) now also stores:
- the four declarations, each with its own tick time, text key and version
- the exact notice wording and version shown, and the language
Signature records stay unchangeable, as today.

## Database change (proposed, for your review)
Additive only, no existing rows altered:
- Add to the existing signature-record table: `declarations` (JSON list: key, text shown, accepted, accepted_at) and `declarations_version`.
- Add to the privacy-notice table: `declarations` (JSON list of the four checkbox texts per language) so wording is controlled on the server, not by the browser.
- Insert a new notice version `v2.0` (English) with your text; the old `v1.0-draft` is switched off but kept as history.

## Translations (needs your input)
I can add the screen labels in all 13 languages, but the legal notice and checkbox wording should come from you/your legal team as approved translations. Until provided, other languages will show the approved English text with a "English version shown" note. I will not invent legal translations.

## Server check
The signature recording function will reject a submission unless all four declarations are true and match the server's active notice; it stores their server-side times.

## Rollout
Applied to the development/shared Cloud setup only after you approve this plan. Nothing goes to vms.resustainability.com without your separate approval; I will provide the matching SQL and undo script.

## Technical details
- Files: `DpdpNoticeSignature.tsx` (4 checkboxes, links `target="_blank" rel="noopener noreferrer"`, onChange returns declarations), `NewVisitor.tsx`, `SelfService.tsx` (gating + payload), `capture-visitor-signature/index.ts` (zod: `declarations` array of 4 required true keys, compare with notice.declarations, store), 13 locale files (UI labels), unit test asserting submit is blocked unless all 4 ticked.
- Migration: `ALTER TABLE visitor_agreements ADD COLUMN IF NOT EXISTS declarations jsonb, ADD COLUMN declarations_version text;` `ALTER TABLE dpdp_privacy_notices ADD COLUMN IF NOT EXISTS declarations jsonb;` New notice row inserted via data tool (wording trigger blocks edits, so new version rather than update).
