
User wants a single direct "Install App" button users can click to install — instead of (or in addition to) the bottom-sheet banner. Click → installs automatically where the browser supports it; falls back to clear instructions where it doesn't.

## Reality check (browser limits)
- **Android Chrome / Edge / desktop Chromium**: One-tap install IS possible — must reuse the captured `beforeinstallprompt` event and call `.prompt()` on a user click. ✅
- **iOS Safari**: No programmatic install API exists. Apple requires the user to manually tap Share → Add to Home Screen. We can't bypass this — best we can do is open a modal with clear visual steps. ⚠️
- **Desktop browsers without prompt event yet**: Show "Open in Chrome to install" hint.

So "fully automatic on click" works on Android/Chromium. iOS is physically capped by Apple — we'll show a guided modal.

## Plan

### 1. New component `src/components/install/InstallButton.tsx`
A reusable button with three behaviors based on environment:
- **Android/Chromium with captured prompt** → click fires `deferredPrompt.prompt()` directly → native install dialog → installed. One tap, no extra UI.
- **iOS Safari** → click opens a small dialog showing the 3-step Share → Add to Home Screen visual guide (reuse content from existing `InstallPromptBanner`).
- **Already installed** → button hidden (uses `display-mode: standalone` check).
- **Desktop / no prompt available** → click opens dialog with "Open this site in Chrome and tap menu → Install app" hint.

Uses the same module-scope `beforeinstallprompt` capture pattern already in `InstallPromptBanner.tsx` so the event is preserved across navigations.

Props: `variant`, `size`, `className`, optional `label` — drops in anywhere.

### 2. Wire it into the Header
Edit `src/components/layout/Header.tsx`:
- Replace the current "Install App" dropdown menu item (which just navigates to `/install`) with the new `<InstallButton />` directly inside the dropdown — clicking it now triggers install on the spot instead of routing away.
- Also add a compact `<InstallButton size="sm" />` visible inline in the header on mobile/tablet (hidden on desktop and when installed) so users see a one-tap install affordance without opening the menu.

### 3. Use it on the existing `/install` page
Edit `src/pages/Install.tsx`: replace its custom install button with `<InstallButton size="lg" />` so behavior stays consistent everywhere.

### 4. Optional: simplify the banner
The existing `InstallPromptBanner` already does this work inline. Keep it as-is (auto post-login prompt) but have its primary action delegate to `InstallButton` logic so we have one source of truth. Lightweight refactor — just call the same shared `triggerInstall()` helper extracted to `src/lib/pwa.ts`.

### Files
- **New**: `src/components/install/InstallButton.tsx`, `src/lib/pwa.ts` (shared `getDeferredPrompt`, `triggerInstall`, `isStandalone`, `isIOS` helpers)
- **Edit**: `src/components/layout/Header.tsx`, `src/pages/Install.tsx`, `src/components/install/InstallPromptBanner.tsx` (use shared helpers)

### UX result
- Android user clicks "Install App" anywhere (header chip, dropdown, /install page, or banner) → native Chrome install sheet appears instantly → app installed. Single click, fully automatic.
- iOS user clicks → modal pops with 3 illustrated steps (limitation of Apple, unavoidable).
- Already-installed users → button vanishes everywhere.
