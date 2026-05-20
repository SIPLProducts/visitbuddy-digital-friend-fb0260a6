## Goal
Rebrand user-facing "VisiGuard" / "VisiGuard VMS" / "Enterprise VMS" to **RE Sustainability** (RESL), scope the Gate QR Codes page to the currently selected location, and stop the QR from hard-coding the Lovable preview domain so on-prem builds (e.g. `vms.resustainability.com`) keep visitors on the same host.

## 1. Replace "VisiGuard / VMS" branding everywhere visible to end users

Replace strings in these files (proposal docs, internal READMEs, edge-function copy and `whatsapp-bridge/` are out of scope — they aren't visible to visitors/operators on-screen):

- `index.html`
  - `<title>` → `RE Sustainability - Visitor Management`
  - `<meta name="author">` → `RE Sustainability`
  - `<meta name="apple-mobile-web-app-title">` → `RE Sustainability`
  - `og:title` / `twitter:title` → `RE Sustainability - Visitor Management`
- `src/pages/Auth.tsx` line 120 — `Enterprise VMS` → `Re Sustainability`
- `src/components/layout/Sidebar.tsx` line 163 — `Enterprise VMS` → `Re Sustainability`
- `src/hooks/useTenantSettings.ts` — default `company_name: 'VisiGuard'` → `'Re Sustainability'`
- `src/pages/GateQRCodes.tsx` print template line 166 — `<div class="title">VisiGuard</div>` → `RE Sustainability`
- `src/components/onboarding/OnboardingTour.tsx` line 28 — `Welcome to VisiGuard` → `Welcome to Re Sustainability VMS`
- `src/components/install/InstallButton.tsx` (lines 69, 99, 142) — replace `VisiGuard` with `Re Sustainability`
- `src/components/install/InstallPromptBanner.tsx` (lines 94, 104) — same
- `src/pages/Install.tsx` (lines 71, 89, 101, 103, 114, 126, 130, 188) — replace `VisiGuard` / `VisiGuard VMS` with `Re Sustainability`
- `src/pages/Help.tsx` (lines 66, 93, 136) — same

`ApproveVisitor.tsx` already renders `Re Sustainability` in the card header — no change needed there. The "VisiGuard VMS" the user sees on the approval screen is actually the **browser tab title** coming from `index.html`, which the change above fixes.

## 2. Scope `/gate-qr-codes` to the currently selected location

In `src/pages/GateQRCodes.tsx`:

- Import and use `useSelectedLocation()` (the same hook used elsewhere for location scoping).
- In `fetchGates()`, when `selectedLocationId !== 'all'`, add `.eq('location_id', selectedLocationId)` to the query. When it is `'all'`, restrict to the user's accessible locations via `accessibleIds` (`.in('location_id', accessibleIds)`) so non-HO admins never see other sites.
- Re-run `fetchGates` whenever `selectedLocationId` changes.
- Show the current location name in the page header so it's obvious which site the QR codes belong to.

## 3. Make QR codes open the same domain the app is served from

Today `GateQRCodes.tsx` hard-codes:
```ts
const baseUrl = import.meta.env.VITE_PUBLIC_URL || 'https://visitbuddy-digital-friend.lovable.app';
```
On the on-prem build (`vms.resustainability.com`) this still encodes the Lovable URL into every printed QR, so scanning sends visitors to the wrong host.

Change to:
```ts
const baseUrl =
  import.meta.env.VITE_PUBLIC_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '');
```

Effect: in the Lovable preview the QR encodes the Lovable origin, on `vms.resustainability.com` it encodes that origin, and on-prem operators can still pin a different public URL via `VITE_PUBLIC_URL` in `.env.production` if the admin UI is served from a different host than the visitor self-service portal.

## Out of scope
- Edge function SMS/WhatsApp/email body copy that says "VisiGuard" — separate ask if needed.
- Proposal/User Manual/Resource Requirements pages (sales collateral, not the live VMS chrome).
- Renaming the deployed Lovable subdomain or the on-prem domain itself (infra).
