## Goal
Replace every occurrence of "VisiGuard" (and case variants like "VisiGuard VMS") with "Re Sustainability" across the codebase, including the files you listed plus all other files that still reference it.

## Files to update
All source files containing "VisiGuard":

**Proposal components** (`src/components/proposal/`)
- ProposalCoverPage.tsx, ProposalExecutiveSummary.tsx, ProposalFeatureSection.tsx, ProposalPricing.tsx, ProposalTechStack.tsx, ProposalTimeline.tsx, ProposalContactPage.tsx

**Pages** (`src/pages/`)
- ProductFeatures.tsx, Settings.tsx, ResourceRequirements.tsx, GateQRCodes.tsx, SelfService.tsx, UserManual.tsx

**Edge functions** (`supabase/functions/`)
- notify-host, approve-visitor, send-email, send-email-badge, send-sms-badge, send-whatsapp-badge, send-vehicle-whatsapp, test-smtp

**Other**
- src/components/settings/WhatsAppSettingsPanel.tsx
- src/hooks/useOnboarding.ts
- src/i18n/index.ts
- src/utils/generateProposalDocx.ts

## Replacement rules
- `VisiGuard VMS` → `Re Sustainability VMS`
- `VisiGuard` → `Re Sustainability`
- Preserve any "Powered by Sharvi Infotech" footers as-is.
- Email subjects, WhatsApp templates, document titles, and onboarding strings all updated consistently.

## Out of scope
- Will not touch `deploy/README*.md` or `whatsapp-bridge/` package metadata unless you also want those updated (these are deploy docs, not user-facing app).
- Old database rows already storing "VisiGuard" remain unchanged (tenant_settings.company_name was already set to "Re Sustainability" in a prior migration).
- After edge function changes, they will be redeployed automatically.

## Verification
Run `grep -ri "visiguard"` across `src/` and `supabase/functions/` and confirm zero matches.
