
## What's actually happening

Same URL, same user, same selected location — but the installed PWA and a fresh web login show different dashboard counts. Two things together explain this:

### 1. The PWA is serving an old bundle (primary cause)

`vite.config.ts` uses `VitePWA` with `registerType: "autoUpdate"` and the default Workbox precache (`globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"]`). That means:

- The installed PWA precaches `index.html` + the JS bundle from the day it was installed and serves them **cache-first** for every navigation.
- A fresh browser tab on the same on-prem URL downloads the **latest** JS bundle.
- Result: two clients running two different versions of the dashboard code (different filter logic, different fields fetched) against the same database → different counts.

A new SW does get downloaded in the background, but with `autoUpdate` it only takes effect after the user fully closes every PWA window — which on Android/iOS PWAs almost never happens. So the installed app keeps showing yesterday's code indefinitely.

### 2. "Today" filter uses UTC, not local date (secondary cause)

`src/pages/Dashboard.tsx:143` computes today as `new Date().toISOString().split('T')[0]` (UTC). After 6:30 PM IST every day, a visitor created locally "today" gets counted as "tomorrow" by this filter — and a device whose clock/timezone differs slightly can land on a different UTC date than another device, so two clients showing "Today's visitors" disagree by one day.

## Fix

### A. Force the installed PWA to always run the latest deployed bundle

Edit `vite.config.ts` `VitePWA` block:

1. Add `registerType: "autoUpdate"` companion options `workbox.skipWaiting: true` and `workbox.clientsClaim: true` so a new SW takes over immediately instead of waiting for every tab to close.
2. Add a runtime caching rule that handles HTML navigations with **NetworkFirst** (3 s timeout, fall back to cache only if offline). This guarantees the installed app pulls the newest `index.html` (which references the newest JS chunks) every time it has network — exactly matching what the web browser does.
3. Keep the existing QR-code CacheFirst rule unchanged.
4. Leave precache as-is for true offline fallback.

### B. Ship a one-shot cleanup so currently-installed PWAs pick up the new SW

Bump the existing `RELOAD_KEY` in `src/main.tsx:23` from `"qr-scanner-v2-reloaded"` to `"sw-networkfirst-v3-reloaded"`. Existing installs will, on next launch, unregister the old SW once and reload — after that they're on the new NetworkFirst SW and stay current automatically.

### C. Make "Today" filtering timezone-correct

In `src/pages/Dashboard.tsx`:

- Replace the UTC `today` string at line 143 with a local-date helper (use the existing `date-fns` `format(new Date(), 'yyyy-MM-dd')`, already imported indirectly via `isToday`).
- Use that local date for the appointments query (`scheduled_date` is a `date` column — local date is what users mean) and for the vehicles `gte`/`lte` window (compute start/end of local day with `startOfDay` / `endOfDay` and send as ISO).
- The `filteredVisitors` "today" chip already uses `isToday(new Date(v.created_at))` (local) — leave it.

This makes the counts identical regardless of when the device's clock crosses UTC midnight.

### D. No DB / RLS / business-logic changes

Counts mismatch is purely a client-side caching + date-bucket issue. RLS, edge functions, and the visitors/appointments/vehicles tables are not touched.

## Files changed

- `vite.config.ts` — add `skipWaiting`/`clientsClaim`, NetworkFirst rule for navigations
- `src/main.tsx` — bump reload key so existing PWAs upgrade once
- `src/pages/Dashboard.tsx` — use local-timezone date for the three "today" queries

## What the user will see

- After redeploying on the Linux server, the installed PWA will reload itself once on next open and from then on always run the same bundle the web shows.
- Today's-visitors / today's-vehicles / today's-appointments counts will match between PWA and web for the rest of the day, including after 6:30 PM IST.

## Out of scope

- No changes to authentication, RLS, edge functions, realtime channels, or the visitors table schema.
- No UI redesign of the dashboard cards or chips.
