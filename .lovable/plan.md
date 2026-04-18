
The user wants: after web login, automatically prompt users on mobile/tablet (iOS + Android) to install the app.

There's already an `/install` page (`src/pages/Install.tsx`) handling install logic — Android `beforeinstallprompt` + iOS Share→Add to Home Screen instructions. So infrastructure exists. What's missing: an automatic post-login prompt on mobile/tablet that points users to install.

Need to verify PWA setup exists (manifest, service worker) — check `vite.config.ts`, `index.html`, `public/manifest.*`. Also check `useAuth` and login flow for where to hook the prompt.

Let me lay out the plan based on what's known.

## Plan

### 1. Post-login install banner (auto-trigger)
Create `src/components/install/InstallPromptBanner.tsx`:
- Detects: mobile or tablet device (`navigator.userAgent` + viewport ≤1024px), not already installed (`display-mode: standalone` check), not previously dismissed (localStorage flag `install_prompt_dismissed`).
- Shows a bottom sheet / dialog 1.5s after login completes with:
  - App icon + "Install VisiGuard on your device"
  - **Android/Chrome**: "Install" button — fires the captured `beforeinstallprompt` event directly (one tap install).
  - **iOS Safari**: Step illustration — "Tap Share → Add to Home Screen" with the Share/Plus icons (same content as `/install` page but inline).
  - "Maybe later" button (sets dismissed flag for 7 days) and "Don't show again" (permanent).
- Captures `beforeinstallprompt` globally early so it's available when banner mounts.

### 2. Hook into auth/layout
Mount `InstallPromptBanner` inside `src/components/layout/ProtectedLayout.tsx` so it appears on every authenticated page once, after the user signs in. It self-hides on desktop, when already installed, or after dismissal.

### 3. Header "Install App" entry
Add an "Install App" item to the user dropdown in `src/components/layout/Header.tsx` (visible only on mobile/tablet and when not installed) linking to `/install` — gives users a way to re-trigger install if they dismissed the banner.

### 4. Verify PWA prerequisites
Check `vite.config.ts` for `vite-plugin-pwa` and `public/manifest.webmanifest` + icons. If missing, add a minimal manifest (no service worker — just `display: standalone` + icons) so Android shows the install prompt and iOS "Add to Home Screen" produces a proper standalone app. Per Lovable PWA guidance, avoid full service-worker PWA unless user wants offline; installability only needs the manifest.

### 5. iOS detection nuance
iOS doesn't fire `beforeinstallprompt`. Banner branches on `/iPad|iPhone|iPod/.test(ua)` to show the Share→Add to Home Screen visual instructions instead of an Install button. Tablets (iPad in desktop mode) — also detect via `navigator.maxTouchPoints > 1 && /Mac/.test(ua)`.

### Files to edit / create
- `src/components/install/InstallPromptBanner.tsx` (new)
- `src/components/layout/ProtectedLayout.tsx` (mount banner)
- `src/components/layout/Header.tsx` (add menu link, mobile-only)
- `vite.config.ts` + `public/manifest.webmanifest` + icons (only if missing — will verify in implementation)

### UX result
1. User logs in on phone/tablet → 1.5s later a friendly bottom sheet appears: "Install VisiGuard for faster access".
2. Android → one-tap install via native prompt.
3. iOS → clear 3-step Share → Add to Home Screen instructions inline.
4. Dismiss → won't reappear for 7 days. Always re-accessible via user menu → Install App.
5. Desktop / already-installed users → banner never shows.
