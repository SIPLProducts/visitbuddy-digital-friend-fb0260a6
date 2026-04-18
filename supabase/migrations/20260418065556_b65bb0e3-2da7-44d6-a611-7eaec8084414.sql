-- Unschedule any auto-checkout cron jobs
DO $$
DECLARE
  job_record RECORD;
BEGIN
  FOR job_record IN
    SELECT jobname FROM cron.job
    WHERE command ILIKE '%auto-checkout-reminder%'
       OR jobname ILIKE '%auto-checkout%'
       OR jobname ILIKE '%checkout-reminder%'
  LOOP
    PERFORM cron.unschedule(job_record.jobname);
  END LOOP;
END $$;

-- Drop the now-unused columns from tenant_settings
ALTER TABLE public.tenant_settings
  DROP COLUMN IF EXISTS checkout_warning_hour,
  DROP COLUMN IF EXISTS security_contact_number;