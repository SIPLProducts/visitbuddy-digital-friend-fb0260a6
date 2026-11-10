# Visitor Privacy Notice: four acknowledgements — review package

**Status: draft only. No app source, database, storage, or deployed function was changed.** These files are kept outside app source, migrations, and Edge Function directories, so they are not loaded by the preview or deployed automatically.

## Confirmed current state

Read-only inspection of the shared project database confirmed:

- `public.dpdp_privacy_notices` exists with `id`, `location_id`, `language`, `version`, `title`, `body`, `is_active`, `approved_by`, `approved_at`, `created_by`, and `created_at`.
- `public.visitor_agreements` already contains the notice version/language/reference, agreement snapshot, acknowledgement flag, signature path/hash, and signed timestamp. It does not currently contain four separate acknowledgement fields.
- Existing notice RLS allows public reads of active notices; staff insert/update are restricted by the existing HO-admin check. Agreement reads are scoped to authorized staff; agreement writes are service-role only. This proposal does not change those policies or grants.
- The currently active global English notice is `v1.0-draft`. It was not edited. A new notice version must be created separately and remain inactive until approved.
- `NewVisitor.tsx` and `SelfService.tsx` share `DpdpNoticeSignature.tsx`; the capture Edge Function is the trusted writer of signed agreement evidence. NDA reporting treats legacy agreement types separately.

The project preview and published app share the same Cloud backend. Therefore, no migration, notice insertion/activation, function deployment, production release, or visitor-data cleanup was performed.

## Proposed visitor-facing English content

### 1. Personal Data Collection and Processing

> We seek your consent to collect and process your personal data, including your name, mobile number, email address, company name, and government ID number, for the purpose of visiting our premises, meeting lawful and specified needs, and retaining the data as required under applicable regulations.
>
> Adequate safeguards are in place to prevent misuse or unauthorized access.

### 2. Four separately required, initially unchecked acknowledgements

1. I consent to the processing of my personal data for the above-mentioned purposes and confirm that the data shared is accurate and mine.
2. I understand that I can withdraw or modify my consent at any time through written notice to dpo@re.one, and such withdrawal may limit or affect the services offered.
3. I authorize Re Sustainability Limited to share my data with its authorized service providers/vendors strictly for fulfilling the purpose described above.
4. I have read and accept the Privacy Policy of ReSL and Terms of Service.

### 3. Links

- Privacy Policy: https://re.one/privacy-policy/
- Terms of Service: https://re.one/terms-of-service/

Both links are intended to open in a new tab using `target="_blank"` and `rel="noopener noreferrer"`.

The English and 12 additional language texts are in `translations.draft.json`. All non-English texts are **unapproved drafts**, not legally approved translations. Do not activate or show them as approved until your legal/translation reviewers approve them.

## Database proposal

`001_add_per_acknowledgements.sql` is a **DDL-only draft**. It adds six immutable notice-copy/link columns to the existing `dpdp_privacy_notices` table and eight nullable boolean/timestamp columns to existing `visitor_agreements`. It also expands the existing notice immutability trigger to freeze the new notice wording and URLs. Historical records remain NULL in the new fields; no historical visitor or agreement rows are rewritten. No new agreement table, RLS policy, grant, or storage policy is proposed.

The four timestamps represent the trusted server capture time for each required acknowledgement when the visitor submits the completed form. The browser's checkbox click times are not trusted as legal evidence and will not be accepted from the client. All four server timestamps may be equal because they are committed together with the signed notice.

The migration deliberately does **not** insert or activate notice data. Once the migration and copy are separately approved, a new version can be inserted inactive via the authorized notice-management process. The present active `v1.0-draft` record remains untouched.

## Application change proposal (not implemented)

- Shared notice panel: fetch the active notice for the selected location/language; render its notice body, four independent unchecked checkboxes, and two external links. Keep its existing electronic-signature pad and confirmation flow.
- Shared state: replace the single acknowledgement boolean with four independent booleans, while retaining notice ID, language/version, and signature. Changing location or language resets all boxes and requires a new signature for the newly presented version.
- Staff and self-service submit gates: block submission unless a notice is available, all four booleans are true, and the signature is confirmed. Keep each current visitor-creation flow otherwise intact.
- Capture Edge Function: accept only four literal `true` values; fetch the selected notice from the database; validate it is active and applicable to the visitor's location; use only database notice/version/language/copy/URLs; save the exact rendered snapshot and four server-generated timestamps through the existing service-role insertion; preserve current PNG validation, hashing, storage privacy, rate limiting, and cleanup.
- Keep NDA and safety-declaration flows and compliance metrics separate. No change to visitor IDs, role logic, or existing history is part of this request.

## Pre-application verification

Run the following read-only query again immediately before any later migration. It must return no rows for the 14 proposed new columns; if any exist, stop and review rather than applying or dropping them.

```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND ((table_name = 'dpdp_privacy_notices' AND column_name IN (
    'acknowledgement_1_text', 'acknowledgement_2_text', 'acknowledgement_3_text', 'acknowledgement_4_text',
    'privacy_policy_url', 'terms_of_service_url'
  )) OR (table_name = 'visitor_agreements' AND column_name IN (
    'acknowledgement_1', 'acknowledgement_1_at', 'acknowledgement_2', 'acknowledgement_2_at',
    'acknowledgement_3', 'acknowledgement_3_at', 'acknowledgement_4', 'acknowledgement_4_at'
  )))
ORDER BY table_name, ordinal_position;
```

Also re-check that the current active notice/version, table policies, and column types match the state summarized above; this package must not be applied to a different schema without review.

## Rollback and recovery

`002_safe_rollback.sql` is intentionally limited to a pre-use rollback. It aborts if any notice copy/link or visitor acknowledgement evidence has been stored, or if it cannot find exactly the expected 14 columns. It then restores the existing notice-freeze function and drops only those 14 additive columns. It does not drop tables, change RLS, delete visitors, delete signatures, or restore unrestricted policies. Once any new version/copy or acknowledgement evidence is stored, do not run the rollback: use a forward-compatible correction and retain the evidence.

## Review gates / outstanding risks

1. Confirm the supplied wording and DPO address are accurate and legally approved for the relevant processing purposes. This technical change does not establish that consent is the appropriate lawful basis for every processing activity.
2. Approve English and each translated copy; the 12 translations are drafts only.
3. Confirm whether checkbox 2's “withdraw or modify consent” wording and vendor-sharing statement match approved organizational practice.
4. Test self-service and staff capture in a genuinely isolated staging backend before any production release. The existing shared backend is not an isolated staging target.
5. Regression-test NDA/safety declaration capture and compliance reporting, both registration flows, touch signature drawing, location/language change resets, missing notice, rejected incomplete acknowledgements, immutable evidence, and exact readback of notice version/snapshot/timestamps.
6. Obtain separate explicit approval before any shared-backend migration, Edge Function deployment, notice activation, or production release.
