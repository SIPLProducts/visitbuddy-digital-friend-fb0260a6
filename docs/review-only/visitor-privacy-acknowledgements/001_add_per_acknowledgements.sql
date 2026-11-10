-- REVIEW-ONLY DRAFT. NOT APPLIED.
-- Additive schema only. No visitor/agreement rows are modified and no policy/RLS grants change.
-- Preflight confirmed these columns are absent in the inspected shared database on 2026-11-10.
-- Re-run the preflight query in the accompanying review document before any future application.

ALTER TABLE public.dpdp_privacy_notices
  ADD COLUMN acknowledgement_1_text text,
  ADD COLUMN acknowledgement_2_text text,
  ADD COLUMN acknowledgement_3_text text,
  ADD COLUMN acknowledgement_4_text text,
  ADD COLUMN privacy_policy_url text,
  ADD COLUMN terms_of_service_url text;

ALTER TABLE public.visitor_agreements
  ADD COLUMN acknowledgement_1 boolean,
  ADD COLUMN acknowledgement_1_at timestamptz,
  ADD COLUMN acknowledgement_2 boolean,
  ADD COLUMN acknowledgement_2_at timestamptz,
  ADD COLUMN acknowledgement_3 boolean,
  ADD COLUMN acknowledgement_3_at timestamptz,
  ADD COLUMN acknowledgement_4 boolean,
  ADD COLUMN acknowledgement_4_at timestamptz;

COMMENT ON COLUMN public.dpdp_privacy_notices.acknowledgement_1_text IS 'Immutable versioned visitor acknowledgement copy; legal review required before activation.';
COMMENT ON COLUMN public.dpdp_privacy_notices.acknowledgement_2_text IS 'Immutable versioned visitor acknowledgement copy; legal review required before activation.';
COMMENT ON COLUMN public.dpdp_privacy_notices.acknowledgement_3_text IS 'Immutable versioned visitor acknowledgement copy; legal review required before activation.';
COMMENT ON COLUMN public.dpdp_privacy_notices.acknowledgement_4_text IS 'Immutable versioned visitor acknowledgement copy; legal review required before activation.';
COMMENT ON COLUMN public.dpdp_privacy_notices.privacy_policy_url IS 'Privacy policy URL displayed with this immutable notice version.';
COMMENT ON COLUMN public.dpdp_privacy_notices.terms_of_service_url IS 'Terms of service URL displayed with this immutable notice version.';
COMMENT ON COLUMN public.visitor_agreements.acknowledgement_1 IS 'Separate required visitor acknowledgement captured with the privacy notice.';
COMMENT ON COLUMN public.visitor_agreements.acknowledgement_1_at IS 'Server-generated time when acknowledgement 1 was accepted with the signed notice.';
COMMENT ON COLUMN public.visitor_agreements.acknowledgement_2 IS 'Separate required visitor acknowledgement captured with the privacy notice.';
COMMENT ON COLUMN public.visitor_agreements.acknowledgement_2_at IS 'Server-generated time when acknowledgement 2 was accepted with the signed notice.';
COMMENT ON COLUMN public.visitor_agreements.acknowledgement_3 IS 'Separate required visitor acknowledgement captured with the privacy notice.';
COMMENT ON COLUMN public.visitor_agreements.acknowledgement_3_at IS 'Server-generated time when acknowledgement 3 was accepted with the signed notice.';
COMMENT ON COLUMN public.visitor_agreements.acknowledgement_4 IS 'Separate required visitor acknowledgement captured with the privacy notice.';
COMMENT ON COLUMN public.visitor_agreements.acknowledgement_4_at IS 'Server-generated time when acknowledgement 4 was accepted with the signed notice.';

-- Preserve existing notice immutability and additionally freeze all copy and URLs.
-- is_active / approval metadata remain editable by the existing authorized workflow.
CREATE OR REPLACE FUNCTION public.dpdp_notice_freeze_content()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.title IS DISTINCT FROM OLD.title
     OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.version IS DISTINCT FROM OLD.version
     OR NEW.language IS DISTINCT FROM OLD.language
     OR NEW.location_id IS DISTINCT FROM OLD.location_id
     OR NEW.acknowledgement_1_text IS DISTINCT FROM OLD.acknowledgement_1_text
     OR NEW.acknowledgement_2_text IS DISTINCT FROM OLD.acknowledgement_2_text
     OR NEW.acknowledgement_3_text IS DISTINCT FROM OLD.acknowledgement_3_text
     OR NEW.acknowledgement_4_text IS DISTINCT FROM OLD.acknowledgement_4_text
     OR NEW.privacy_policy_url IS DISTINCT FROM OLD.privacy_policy_url
     OR NEW.terms_of_service_url IS DISTINCT FROM OLD.terms_of_service_url THEN
    RAISE EXCEPTION 'Privacy notice wording cannot be edited. Create a new version instead.' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

-- Deliberately no INSERT/UPDATE to live notices in this migration.
-- Create a new inactive notice version separately after legal and translation review.
