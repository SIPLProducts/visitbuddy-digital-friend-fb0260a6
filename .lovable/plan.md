## Problem
The app is no longer failing because of PostgREST `503 / PGRST002`; this is now a frontend runtime crash:

`crypto.randomUUID is not a function`

On your on-prem setup the app is being opened from `http://10.100.4.36`. In many browsers, `crypto.randomUUID()` only works in a **secure context** (`https://` or `localhost`). Because it is missing, React crashes while mounting realtime channels after login, causing the blank page.

## Plan
1. Add a shared browser-safe ID helper in `src/lib/utils.ts`:
   - Use `crypto.randomUUID()` when available.
   - Fallback to `crypto.getRandomValues()` when available.
   - Final fallback to timestamp + random string.

2. Replace all frontend `crypto.randomUUID()` calls with the safe helper in:
   - Dashboard realtime channels
   - Visitors realtime channel
   - Vehicles realtime channels
   - Notification dropdown realtime channel
   - ANPR / camera realtime pages
   - Visitor/vehicle ID generation pages and reports

3. Leave backend functions unchanged:
   - `supabase/functions/*` runs in Deno/server runtime where `crypto.randomUUID()` is supported.

4. Verify no frontend `crypto.randomUUID()` usage remains under `src/`.

## Expected result
After redeploying the frontend, the app will work on `http://10.100.4.36` without requiring HTTPS, and the blank page after login should stop.