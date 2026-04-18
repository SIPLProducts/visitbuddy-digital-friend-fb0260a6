
User wants to remove the auto-checkout-at-6PM feature entirely. It's location-agnostic anyway (runs globally on a cron). Need to find all related pieces.

Components involved:
1. Edge function `auto-checkout-reminder` — does the work
2. `supabase/config.toml` entry for it
3. Cron job in DB scheduling it
4. Settings UI exposing `checkout_warning_hour` and `security_contact_number` 
5. `tenant_settings` columns (can leave columns, just stop using them — safer)
6. `useTenantSettings` hook fields

Let me check the Settings page and cron jobs.
<lov-tool-use id="toolu_vrtx_019jRbCgENijA9DZXWs2snXE" name="code--search_files" integration-id="code" data="{\"query\": \"checkout_warning_hour|security_contact_number|auto-checkout-reminder|auto_checkout\", \"include_patterns\": \"*.ts,*.tsx,*.toml,*.sql\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01V8NKyBK2j92Map5AMdztUL" name="tool_search" data="{\"target\": \"supabase--read_query\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01D2jX9ZZzt19Cn36FBF4Cq7" name="code--search_files" integration-id="code" data="{\"query\": \"checkout_warning_hour|auto-checkout-reminder|security_contact_number\"}">
</lov-tool-use>
Let me check the cron job and Settings UI section.
<lov-tool-use id="toolu_vrtx_01M7sh9E1pkP2dgVpZmtvkxs" name="code--exec" integration-id="code" data="{\"command\": \"psql -c \\\"SELECT jobid, jobname, schedule, command FROM cron.job WHERE command ILIKE '%auto-checkout%' OR jobname ILIKE '%checkout%';\\\"\", \"user_facing_description\": \"Checking scheduled cron jobs for auto-checkout\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01PRFk6VEPkBjvFqzTV7rEoD" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/Settings.tsx\", \"lines\": \"370-400\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_017B5dpDBzB5MrHX3bRisxPY" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/Dashboard.tsx\", \"lines\": \"525-575\"}">
</lov-tool-use>
I have enough context. The dashboard banner is just a UI warning (not the auto-checkout itself) — I should clarify whether to remove that too, but the user said "auto checkout functionality at 6 PM" so the banner is related and should likely also go since it serves the same purpose. I'll keep it simple.

<lov-plan>
User wants the daily 6 PM auto-checkout completely removed across all locations.

What this currently does: a scheduled job (cron) hits the `auto-checkout-reminder` edge function daily; if any visitors are still checked in past the warning hour, it WhatsApp/SMSs them, emails admins, and force-checks them out.

Related UI: Settings has a "Checkout Warning Hour" + "Security Contact Number" input, and Dashboard shows an amber banner past that hour. These exist solely to support this feature, so removing them too keeps the codebase clean. (If you want to keep the dashboard warning banner as a passive reminder, say so and I'll leave it.)

## Plan — Remove auto-checkout entirely

### 1. Stop the schedule (DB)
- Drop the `pg_cron` job that invokes `auto-checkout-reminder` (will scan `cron.job` and unschedule the matching job).

### 2. Remove the edge function
- Delete `supabase/functions/auto-checkout-reminder/index.ts`
- Remove its `[functions.auto-checkout-reminder]` block from `supabase/config.toml`
- Call `supabase--delete_edge_functions` to undeploy it

### 3. Clean up Settings UI
- `src/pages/Settings.tsx`: remove the "Checkout Warning Hour" + "Security Contact Number" fields (the row at lines 379–391) and their references in the local state type
- `src/hooks/useTenantSettings.ts`: drop `checkout_warning_hour` and `security_contact_number` from the interface + defaults

### 4. Clean up Dashboard
- `src/pages/Dashboard.tsx`: remove the "Visitor(s) Still Checked In After X PM" amber banner block (lines 531–551)

### 5. Drop unused DB columns
- Migration: `ALTER TABLE public.tenant_settings DROP COLUMN checkout_warning_hour, DROP COLUMN security_contact_number;`

### Result
- No more 6 PM forced checkouts, no WhatsApp/SMS to visitors, no admin alert emails, no dashboard warning banner, no leftover settings fields. Visitors stay `checked_in` until manually checked out (or until the existing `auto_checkout_hours` stale-cleanup logic, which is separate, handles them).
