
The uploaded image is the RESL "re" round red logo. The user wrote "Bridge" — almost certainly a typo for "Badge" (the safety permit badge).

Currently `src/assets/resl-logo.png` is the single shared logo used in 9 places: visitor badge, proposal cover, proposal contact, login (Auth), Install page, Self-Service portal, Product Features doc, Resource Requirements doc, ApproveVisitor page, PrintBadge page.

The Safety Permit Badge already has a red header with the logo rendered in white via `brightness-0 invert`, so this round red "re" mark will work great there.

## Plan

### Option A — Use only on the Safety Permit Badge (recommended, matches request)
1. Save the new logo as a new asset: `src/assets/resl-badge-logo.png` (via lov-copy from `user-uploads://logo-01.png`).
2. Update `src/components/badge/SafetyPermitBadge.tsx`:
   - Import the new file as `reslBadgeLogo`.
   - Replace the default `companyLogo = reslLogo` prop default with `reslBadgeLogo`.
   - Keep the `brightness-0 invert` filter so the red "re" renders white on the red header band.

### Option B — Replace the logo everywhere (login, proposals, install, self-service, etc.)
Overwrite `src/assets/resl-logo.png` with the uploaded file. No code changes needed. All 9 usages pick it up automatically.

### My default
I'll go with **Option A** since you said "in Badge" specifically. If you actually meant everywhere, just say "use it everywhere" and I'll swap globally instead.
