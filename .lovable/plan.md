

# Auto-Delete Visitor Records After Retention Period

## Summary
Create a scheduled edge function that deletes visitor records older than the configured `data_retention_days` (already exists in tenant_settings, default 90 days). Update the default to 30 days. Schedule a daily cron job to invoke it.

## Changes

### 1. New Edge Function: `supabase/functions/auto-delete-visitors/index.ts`
- Read `data_retention_days` from `tenant_settings` (integer, days)
- Select visitor IDs where `created_at < now() - interval '${days} days'`
- Delete related `accompanying_visitors` and `visitor_agreements` for those IDs first
- Delete the visitor records
- Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS
- Return count of deleted records

### 2. Update default retention to 30 days
- Migration: `UPDATE tenant_settings SET data_retention_days = 30 WHERE data_retention_days = 90`

### 3. Schedule daily cron job
- Enable `pg_cron` and `pg_net` extensions
- Insert cron job running daily at 02:00 UTC calling the edge function via `net.http_post`

## Files Changed
- `supabase/functions/auto-delete-visitors/index.ts` — New cleanup edge function
- Database migration — Update default retention to 30 days
- Cron job via insert tool — Daily scheduled invocation

