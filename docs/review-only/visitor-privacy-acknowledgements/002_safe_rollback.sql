-- REVIEW-ONLY DRAFT. NOT APPLIED.
-- Non-destructive rollback: restore the pre-change notice-freeze function only.
-- Deliberately leaves the 14 additive columns in place so rollback can NEVER
-- drop a pre-existing column or erase acknowledgement/notice evidence.
-- The application change is not active in this review-only package.

CREATE OR REPLACE FUNCTION public.dpdp_notice_freeze_content()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.title IS DISTINCT FROM OLD.title OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.version IS DISTINCT FROM OLD.version OR NEW.language IS DISTINCT FROM OLD.language
     OR NEW.location_id IS DISTINCT FROM OLD.location_id THEN
    RAISE EXCEPTION 'Privacy notice wording cannot be edited. Create a new version instead.' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

-- Columns intentionally remain. If a future deployment has recorded any
-- acknowledgement data, retain it and use a forward fix; never drop evidence.
