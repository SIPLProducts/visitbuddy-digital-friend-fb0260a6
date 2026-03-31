

# Merge Settings + Branding into Unified Settings & Make Checkout Warning Time Configurable

## Overview
Merge the separate `/branding` (Enterprise Settings) page and `/settings` page into a single unified Settings page at `/settings`. Add a configurable "checkout warning hour" field to the `tenant_settings` table so the 6 PM cutoff is no longer hardcoded. Update the Dashboard banner and the cron edge function to use this setting.

## Changes

### 1. Add `checkout_warning_hour` column to `tenant_settings`
- New column: `checkout_warning_hour integer DEFAULT 18` (represents hour in 24h format, e.g. 18 = 6 PM)
- Database migration only

### 2. Rebuild Settings page (`src/pages/Settings.tsx`)
- Replace the current static/non-functional Settings page with a unified page that uses `useTenantSettings()` hook
- Tabs: **General** (company name, logo, timezone, date/language), **Branding** (colors, badge, email customization — from BrandingSettings), **Policies** (NDA, photo capture, watchlist — from BrandingSettings), **Security** (session timeout, auto checkout hours, **checkout warning hour** dropdown), **Data Management** (retention period, GDPR info), **Notifications** (notification preferences), **Help** (tour, docs, support, proposal)
- The new **checkout warning hour** field: dropdown with options like 5 PM, 6 PM, 7 PM, 8 PM, 9 PM, 10 PM
- All fields save to `tenant_settings` via the existing `useTenantSettings` hook
- Single "Save All" button in header

### 3. Update `useTenantSettings.ts`
- Add `checkout_warning_hour` to the interface and defaults (default: 18)

### 4. Update Dashboard checkout warning (`src/pages/Dashboard.tsx`)
- Replace hardcoded `nowHour >= 18` with `nowHour >= settings.checkout_warning_hour`
- Fetch tenant settings via `useTenantSettings()`

### 5. Update edge function (`supabase/functions/auto-checkout-reminder/index.ts`)
- Fetch `checkout_warning_hour` from `tenant_settings` table
- Use it to determine the IST hour for the cron description (note: cron schedule stays fixed, but the function itself checks whether it should actually send notifications based on the configured hour)

### 6. Remove BrandingSettings page
- Delete `src/pages/BrandingSettings.tsx`
- Remove `/branding` route from `src/App.tsx`
- Update any sidebar/nav links pointing to `/branding` to point to `/settings`

### 7. Update Sidebar navigation
- Remove "Enterprise Settings" / "Branding" link
- Ensure Settings link covers everything

## Files Modified
1. SQL migration — add `checkout_warning_hour` column
2. `src/hooks/useTenantSettings.ts` — add new field
3. `src/pages/Settings.tsx` — complete rewrite merging both pages
4. `src/pages/Dashboard.tsx` — use configurable hour
5. `supabase/functions/auto-checkout-reminder/index.ts` — read configured hour
6. `src/App.tsx` — remove `/branding` route
7. `src/pages/BrandingSettings.tsx` — delete
8. `src/components/layout/Sidebar.tsx` — update nav links

