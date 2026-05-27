# Fix: SMS QR link sometimes opens login page

## Root cause

SMS links sent after approval look like `https://<domain>/?<shortcode>` (DLT-approved short URL). For this to open the QR page, an inline script at the bottom of `src/App.tsx` must rewrite the URL to `/s/<shortcode>` **before React mounts**. If the rewrite fails to match, the browser stays at `/`, which is inside `ProtectedLayout`, and the user is sent to `/auth` (the login page).

There are several real cases where the rewrite silently fails today, and they tend to correlate with specific locations / specific visitors:

1. **Short-code missing → fallback uses a hyphenated slice.**
   `approve-visitor` and `send-sms-badge` fall back to `cleanUrlPart(visitor_id).toLowerCase().slice(0, 10)`. `cleanUrlPart` keeps hyphens, so for IDs like `HO-271125-0001` the URL tail becomes `ho-271125-` — the regex `/^\?[a-z0-9]{6,10}$/i` rejects hyphens, the rewrite is skipped, and `/` resolves to the login page. Whether the fallback fires depends on the visitor's location/plant prefix and whether the row has a `short_code`, which is why the user sees it only "for some locations".

2. **Short-code that starts with `s` is misrouted to `/safety/...`.**
   `/^\?s[a-z0-9]{4,8}$/i` is tested before the generic short-code regex, so an 8-char visitor short-code beginning with `s` (e.g. `s1a2b3c4`) is sent to `SafetyInfo`, which then errors out. No current visitor matches this in the cloud DB, but it can happen on the on-prem DB.

3. **Stale deployed bundle on the Linux server.**
   If the on-prem build predates the `/s/<code>` short-link rewrite, every `/?<code>` URL falls through to `/` → `/auth`. A redeploy is required regardless once the code below changes.

In all three cases the symptom is identical: the protected `/` route redirects to `/auth`.

## Fix

Make the public short-link routing robust so an unauthenticated hit on `/?<anything-shortlinkish>` is **never** allowed to reach `ProtectedLayout`.

### 1. `src/App.tsx` — harden the pre-React rewrite

Replace the inline `if (typeof window !== "undefined")` block with logic that:

- Detects `?qr<CODE>` → `/visitor/<CODE>` (legacy, unchanged).
- Detects `?s<4-8 alnum>` **only when total length matches a safety code exactly** (`raw.length` between 5 and 9 AND not also a valid visitor short-code length of 8). To remove ambiguity, anchor safety on the existing `safety_short_code` length (6) used by `generate_location_safety_short_code`: require `^\?s[a-z0-9]{6}$` (7 chars total). This eliminates the "short-code starts with s" collision.
- Detects `?<6-10 alnum>` → `/s/<code>` (visitor short link).
- Detects `?<token-with-hyphens-or-uppercase>` that looks like a visitor_id tail → `/visitor/<UPPERCASED>` as a defensive fallback so the broken hyphenated SMS fallback still resolves.

Mirror the same matching set in the `AppRoutes` `useEffect` so client-side navigations are consistent.

### 2. `src/components/layout/ProtectedLayout.tsx` — last-resort guard

Before the `if (!user) return <Navigate to="/auth" />` line, inspect `location.pathname === "/"` and `location.search`. If the search string matches any short-link pattern, render `<Navigate to="/s/<code>" replace />` (or `/visitor/...` / `/safety/...`) instead of `/auth`. This guarantees that even an outdated/edge-case URL never lands on the login page.

### 3. `supabase/functions/approve-visitor/index.ts` and `supabase/functions/send-sms-badge/index.ts` — fix the hyphenated fallback

In the `qrLink` construction, replace:

```ts
`${smsBase}/?${cleanUrlPart(visitor.visitor_id).toLowerCase().slice(0, 10)}`
```

with a path-based fallback that does not depend on the SPA rewrite at all:

```ts
`${smsBase}/visitor/${cleanUrlPart(visitor.visitor_id)}`
```

(`cleanUrlPart` already uppercases and strips unsafe chars; `/visitor/:visitorCode` is a public route that uppercases the param.) The short-code path is unchanged.

### 4. Redeploy the frontend on the Linux server

After the changes ship, run `deploy/redeploy.sh` (or the user's normal deploy step) so the on-prem nginx serves the updated `index.html` + JS bundle. Without this, fix #1 and #2 will not reach end users.

## Out of scope

No database changes. No design changes. No new routes — only the `/` query-string handling and a hardened SMS fallback URL.
