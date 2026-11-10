-- REVIEW-ONLY DRAFT. NOT APPLIED.
-- Safe only before any new acknowledgement columns or notice-copy fields contain data.
-- Abort rather than deleting evidence or guessing whether a similarly named column pre-existed.

BEGIN;

DO $$
DECLARE
  v_column_count integer;
  v_has_saved_evidence boolean;
BEGIN
  SELECT count(*) INTO v_column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND ((table_name = 'dpdp_privacy_notices' AND column_name IN (
      'acknowledgement_1_text', 'acknowledgement_2_text', 'acknowledgement_3_text', 'acknowledgement_4_text',
      'privacy_policy_url', 'terms_of_service_url'
    )) OR (table_name = 'visitor_agreements' AND column_name IN (
      'acknowledgement_1', 'acknowledgement_1_at', 'acknowledgement_2', 'acknowledgement_2_at',
      'acknowledgement_3', 'acknowledgement_3_at', 'acknowledgement_4', 'acknowledgement_4_at'
    )));

  IF v_column_count <> 14 THEN
    RAISE EXCEPTION 'Rollback stopped: expected all 14 columns from this draft migration; found %.', v_column_count;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.dpdp_privacy_notices
    WHERE acknowledgement_1_text IS NOT NULL OR acknowledgement_2_text IS NOT NULL
       OR acknowledgement_3_text IS NOT NULL OR acknowledgement_4_text IS NOT NULL
       OR privacy_policy_url IS NOT NULL OR terms_of_service_url IS NOT NULL
  ) OR EXISTS (
    SELECT 1 FROM public.visitor_agreements
    WHERE acknowledgement_1 IS NOT NULL OR acknowledgement_1_at IS NOT NULL
       OR acknowledgement_2 IS NOT NULL OR acknowledgement_2_at IS NOT NULL
       OR acknowledgement_3 IS NOT NULL OR acknowledgement_3_at IS NOT NULL
       OR acknowledgement_4 IS NOT NULL OR acknowledgement_4_at IS NOT NULL
  ) INTO v_has_saved_evidence;

  IF v_has_saved_evidence THEN
    RAISE EXCEPTION 'Rollback stopped: new notice copy or acknowledgement evidence exists. Use a forward-compatible fix and retain the evidence.';
  END IF;
END;
$$;

-- Restore the exact pre-draft notice-freeze behavior from the existing DPDP migration.
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

ALTER TABLE public.visitor_agreements
  DROP COLUMN acknowledgement_1,
  DROP COLUMN acknowledgement_1_at,
  DROP COLUMN acknowledgement_2,
  DROP COLUMN acknowledgement_2_at,
  DROP COLUMN acknowledgement_3,
  DROP COLUMN acknowledgement_3_at,
  DROP COLUMN acknowledgement_4,
  DROP COLUMN acknowledgement_4_at;

ALTER TABLE public.dpdp_privacy_notices
  DROP COLUMN acknowledgement_1_text,
  DROP COLUMN acknowledgement_2_text,
  DROP COLUMN acknowledgement_3_text,
  DROP COLUMN acknowledgement_4_text,
  DROP COLUMN privacy_policy_url,
  DROP COLUMN terms_of_service_url;

COMMIT;
