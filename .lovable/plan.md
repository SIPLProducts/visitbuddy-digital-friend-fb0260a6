# Hide DPDP Section for @re.one Visitor Emails

## User-facing behavior
- On both staff visitor registration and the public self-service flow, treat a trimmed, case-insensitive email ending exactly in `@re.one` as exempt.
- Hide the full privacy notice, declarations, and signature area for matching addresses; restore the section and its required checks when the email is changed to another domain.
- Do not change the existing form design or unrelated visitor fields and workflows.

## Submission behavior
- Update each form's validation and submit-button state so `@re.one` entries do not require a notice, acknowledgements, or signature, while all other emails keep the current requirements.
- Staff registration will omit the signature-capture call only for matching addresses.
- Self-service currently creates visitors through the signature-capture function, which strictly requires a notice and signature. Update that function to accept the no-signature path only when the submitted email ends exactly in `@re.one`; retain all existing validation and evidence capture for other domains.
- Clear stale DPDP state when an email changes into the exempt category, and require fresh acknowledgements/signature if changed back.

## Verification
- Add focused tests for trimmed/case-insensitive exact-domain matching, nonmatching domains, and both bypass/required submission conditions.
- Run focused tests and verify both registration screens in matching and nonmatching email states.

## Impact note
- The self-service server function is deployed through the shared Lovable Cloud backend used by preview and the published app. Its change will affect that shared environment; the separate `vms.resustainability.com` server is not included.
