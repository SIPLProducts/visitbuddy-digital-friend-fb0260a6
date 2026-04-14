

# PWA Hardening — Make Install Work Reliably on Mobile & Tablet

## Current State
Your app **already has full PWA support**: manifest, icons, service worker via `vite-plugin-pwa`, and an `/install` page with platform-specific instructions. The mobile layout (bottom nav, safe-area insets, touch targets) is also in place.

## What's Missing
Three small but important fixes to make the PWA install work correctly everywhere:

### 1. Add preview/iframe guard in `main.tsx`
Prevent the service worker from registering inside the Lovable editor preview (which causes stale content). Only activate in production.

### 2. Add `devOptions` and `navigateFallbackDenylist` in `vite.config.ts`
- `devOptions: { enabled: false }` — disables SW in dev mode
- `navigateFallbackDenylist: [/^\/~oauth/]` — prevents caching OAuth redirects

### 3. No other changes needed
- Icons (72–512px) already exist in `public/icons/`
- Manifest with `display: standalone` is configured
- `/install` page with iOS/Android/Desktop instructions exists
- Mobile bottom nav, safe-area insets, pull-to-refresh all in place

## Files affected
- `src/main.tsx` — add SW registration guard (6 lines)
- `vite.config.ts` — add `devOptions` and `navigateFallbackDenylist`

## How to install on your device
After these changes are deployed (published), visit the app URL on your phone/tablet:
- **Android**: Browser will show an "Add to Home Screen" banner automatically
- **iPhone/iPad**: Tap Share → Add to Home Screen
- **Or**: Visit `/install` for step-by-step instructions

