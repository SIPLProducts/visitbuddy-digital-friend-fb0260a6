ALTER TABLE public.visitor_agreements
  ADD COLUMN IF NOT EXISTS declarations jsonb,
  ADD COLUMN IF NOT EXISTS declarations_version text;

ALTER TABLE public.dpdp_privacy_notices
  ADD COLUMN IF NOT EXISTS declarations jsonb;

CREATE OR REPLACE FUNCTION public.dpdp_notice_freeze_content()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.title IS DISTINCT FROM OLD.title OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.version IS DISTINCT FROM OLD.version OR NEW.language IS DISTINCT FROM OLD.language
     OR NEW.location_id IS DISTINCT FROM OLD.location_id
     OR NEW.declarations IS DISTINCT FROM OLD.declarations THEN
    RAISE EXCEPTION 'Privacy notice wording cannot be edited. Create a new version instead.' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END $$;
