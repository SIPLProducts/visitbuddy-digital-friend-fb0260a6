
-- Enable extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Update default retention to 30 days
ALTER TABLE public.tenant_settings ALTER COLUMN data_retention_days SET DEFAULT 30;

-- Add DELETE policy for visitor_agreements so service role can clean up
CREATE POLICY "Service role can delete agreements"
ON public.visitor_agreements
FOR DELETE
USING (true);
