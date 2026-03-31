

# Auto-Notify for Visitors Not Checked Out by 6 PM

## Overview
Create a scheduled backend function that runs daily at 6 PM (IST) to find all visitors who checked in today but haven't checked out, then creates notification records for all admin/manager users alerting them.

## Changes

### 1. Create Edge Function `supabase/functions/auto-checkout-reminder/index.ts`
- Query `visitors` table for records with `status = 'checked_in'` and `check_in_time` on the current date
- For each such visitor, insert a notification into the `notifications` table for all users with admin/manager roles (from `user_location_roles`)
- Notification title: "Visitor Not Checked Out"
- Notification message: includes visitor name, company, check-in time
- Type: "warning"
- Returns summary of how many notifications were created

### 2. Schedule the function with pg_cron
- Enable `pg_cron` and `pg_net` extensions via migration
- Create a cron job that runs daily at `30 12 * * *` (6:00 PM IST = 12:30 UTC) calling the edge function
- Uses `net.http_post` to invoke the function

### 3. Add client-side check in Dashboard (`src/pages/Dashboard.tsx`)
- As a secondary measure, when the dashboard loads after 6 PM, show a prominent alert/banner listing visitors still checked in
- Uses existing real-time visitor data already fetched

### Files
1. `supabase/functions/auto-checkout-reminder/index.ts` — new edge function
2. SQL migration — enable pg_cron/pg_net + schedule the job
3. `src/pages/Dashboard.tsx` — add after-6PM warning banner

