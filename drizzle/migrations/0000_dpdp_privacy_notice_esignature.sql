-- ===== 1. Approved privacy notices (tenant/location/language/version) =====
CREATE TABLE public.dpdp_privacy_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NULL REFERENCES public.locations(id) ON DELETE RESTRICT, -- NULL = applies to all locations
  language text NOT NULL,
  version text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  approved_by uuid NULL,
  approved_at timestamptz NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX dpdp_notices_unique_version ON public.dpdp_privacy_notices (COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::uuid), language, version);
CREATE UNIQUE INDEX dpdp_notices_one_active ON public.dpdp_privacy_notices (COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::uuid), language) WHERE is_active;

GRANT SELECT ON public.dpdp_privacy_notices TO anon, authenticated;
GRANT INSERT, UPDATE ON public.dpdp_privacy_notices TO authenticated;
GRANT ALL ON public.dpdp_privacy_notices TO service_role;
ALTER TABLE public.dpdp_privacy_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active notices are readable" ON public.dpdp_privacy_notices
  FOR SELECT TO anon, authenticated USING (is_active OR public.is_ho_admin(auth.uid()));
CREATE POLICY "HO admins add notices" ON public.dpdp_privacy_notices
  FOR INSERT TO authenticated WITH CHECK (public.is_ho_admin(auth.uid()));
CREATE POLICY "HO admins change notice activation" ON public.dpdp_privacy_notices
  FOR UPDATE TO authenticated USING (public.is_ho_admin(auth.uid())) WITH CHECK (public.is_ho_admin(auth.uid()));

-- Notice wording is frozen once created; only activation/approval fields may change.
CREATE OR REPLACE FUNCTION public.dpdp_notice_freeze_content()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.title IS DISTINCT FROM OLD.title OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.version IS DISTINCT FROM OLD.version OR NEW.language IS DISTINCT FROM OLD.language
     OR NEW.location_id IS DISTINCT FROM OLD.location_id THEN
    RAISE EXCEPTION 'Privacy notice wording cannot be edited. Create a new version instead.' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_dpdp_notice_freeze BEFORE UPDATE ON public.dpdp_privacy_notices
  FOR EACH ROW EXECUTE FUNCTION public.dpdp_notice_freeze_content();

CREATE OR REPLACE FUNCTION public.dpdp_notice_block_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Privacy notice versions are kept as history and cannot be deleted.' USING ERRCODE = '55000';
END $$;
CREATE TRIGGER trg_dpdp_notice_no_delete BEFORE DELETE ON public.dpdp_privacy_notices
  FOR EACH ROW EXECUTE FUNCTION public.dpdp_notice_block_delete();

-- DRAFT English notice (must be reviewed/approved by legal before production use)
INSERT INTO public.dpdp_privacy_notices (location_id, language, version, title, body, is_active)
VALUES (NULL, 'en', 'v1.0-draft', 'Visitor Privacy Notice',
'Data Fiduciary: Re Sustainability Limited (the organisation operating this facility).

Personal data we collect: your name, mobile number, email, company, purpose of visit, host and department, entry gate, vehicle and device details you declare, government ID number (if provided), your photograph and your handwritten electronic signature.

Why we collect it: to register and approve your visit, verify your identity at the gate, issue your visitor badge, ensure safety and emergency evacuation, and keep security records of entry and exit.

How long we keep it: as per the organisation''s configured visitor data retention period, after which records and signature images are deleted, unless a longer period is required by law.

Your rights: you may request access to, correction of, or erasure of your personal data, and raise a grievance, by contacting the facility reception/security desk, who will route your request to the organisation''s designated grievance officer.

Security logging: our systems keep standard technical security logs to protect against misuse. Your signature confirms that this notice was shown to you; it is not a waiver of any of your rights.',
true);

-- ===== 2. Additive columns on existing visitor_agreements =====
ALTER TABLE public.visitor_agreements
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS signature_hash text,
  ADD COLUMN IF NOT EXISTS hash_algorithm text,
  ADD COLUMN IF NOT EXISTS notice_id uuid REFERENCES public.dpdp_privacy_notices(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS notice_version text,
  ADD COLUMN IF NOT EXISTS notice_language text,
  ADD COLUMN IF NOT EXISTS acknowledged boolean,          -- no default: must be set explicitly
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS captured_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS capture_channel text,
  ADD COLUMN IF NOT EXISTS signature_width integer,
  ADD COLUMN IF NOT EXISTS signature_height integer;
CREATE INDEX IF NOT EXISTS idx_agreements_type ON public.visitor_agreements(agreement_type);
CREATE UNIQUE INDEX IF NOT EXISTS uq_agreements_one_privacy_notice ON public.visitor_agreements(visitor_id) WHERE agreement_type = 'privacy_notice';

-- Helper: visitor's location (gate first, then department)
CREATE OR REPLACE FUNCTION public.visitor_location_id(_visitor_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(g.location_id, d.location_id)
  FROM public.visitors v
  LEFT JOIN public.gates g ON g.id = v.gate_id
  LEFT JOIN public.departments d ON d.id = v.department_id
  WHERE v.id = _visitor_id
$$;

CREATE OR REPLACE FUNCTION public.can_view_visitor_agreement(_user_id uuid, _visitor_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL AND (
    public.is_ho_admin(_user_id)
    OR EXISTS (SELECT 1 FROM public.user_location_roles r
               WHERE r.user_id = _user_id AND r.location_id = public.visitor_location_id(_visitor_id))
    OR EXISTS (SELECT 1 FROM public.visitors v JOIN public.employees e ON e.id = v.host_id
               WHERE v.id = _visitor_id AND e.email IS NOT NULL
                 AND lower(e.email) = lower((SELECT email FROM auth.users WHERE id = _user_id)))
  )
$$;

-- ===== 3. Replace permissive policies =====
DROP POLICY IF EXISTS "Anon can insert agreements" ON public.visitor_agreements;
DROP POLICY IF EXISTS "Anon can view agreements" ON public.visitor_agreements;
DROP POLICY IF EXISTS "Authenticated users can view agreements" ON public.visitor_agreements;
DROP POLICY IF EXISTS "Service role can delete agreements" ON public.visitor_agreements;
DROP POLICY IF EXISTS "Users can insert agreements" ON public.visitor_agreements;

REVOKE ALL ON public.visitor_agreements FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.visitor_agreements FROM authenticated;
GRANT SELECT ON public.visitor_agreements TO authenticated;
GRANT SELECT, INSERT ON public.visitor_agreements TO service_role;
REVOKE UPDATE, DELETE, TRUNCATE ON public.visitor_agreements FROM service_role;

CREATE POLICY "Scoped staff can view agreements" ON public.visitor_agreements
  FOR SELECT TO authenticated USING (public.can_view_visitor_agreement(auth.uid(), visitor_id));
CREATE POLICY "Server inserts agreements" ON public.visitor_agreements
  FOR INSERT TO service_role WITH CHECK (visitor_id IS NOT NULL);

-- ===== 4. Immutability (no user-settable bypass) =====
-- UPDATE is always rejected. DELETE is only allowed when executing as the table owner,
-- which only happens inside the SECURITY DEFINER purge functions below.
CREATE OR REPLACE FUNCTION public.visitor_agreements_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Signed agreement records cannot be modified.' USING ERRCODE = '55000';
  END IF;
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Agreement records can only be removed through the approved retention/erasure process.' USING ERRCODE = '55000';
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER trg_visitor_agreements_guard BEFORE UPDATE OR DELETE ON public.visitor_agreements
  FOR EACH ROW EXECUTE FUNCTION public.visitor_agreements_guard();

-- ===== 5. Deletion log (no visitor-identifying data) =====
CREATE TABLE public.dpdp_deletion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reason text NOT NULL,                 -- 'retention' | 'erasure_request' | 'location_deleted'
  agreements_deleted integer NOT NULL,
  actor_user_id uuid NULL,
  actor_kind text NOT NULL,             -- 'scheduled_job' | 'staff'
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dpdp_deletion_log TO authenticated;
GRANT SELECT ON public.dpdp_deletion_log TO service_role;
ALTER TABLE public.dpdp_deletion_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HO admins read deletion log" ON public.dpdp_deletion_log
  FOR SELECT TO authenticated USING (public.is_ho_admin(auth.uid()));

-- Retention purge: callable only by the scheduled job (service role)
CREATE OR REPLACE FUNCTION public.dpdp_purge_agreements_for_retention(_visitor_ids uuid[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  IF _visitor_ids IS NULL OR array_length(_visitor_ids, 1) IS NULL THEN RETURN 0; END IF;
  IF array_length(_visitor_ids, 1) > 5000 THEN RAISE EXCEPTION 'Batch too large'; END IF;
  DELETE FROM public.visitor_agreements WHERE visitor_id = ANY(_visitor_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.dpdp_deletion_log(reason, agreements_deleted, actor_kind) VALUES ('retention', v_count, 'scheduled_job');
  RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.dpdp_purge_agreements_for_retention(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dpdp_purge_agreements_for_retention(uuid[]) TO service_role;

-- Staff purge (erasure request / location deletion): HO admin or location admin of every visitor
CREATE OR REPLACE FUNCTION public.dpdp_purge_agreements_by_staff(_visitor_ids uuid[], _reason text, _note text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_count integer; v_bad integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501'; END IF;
  IF _reason NOT IN ('erasure_request', 'location_deleted') THEN RAISE EXCEPTION 'Invalid reason'; END IF;
  IF _visitor_ids IS NULL OR array_length(_visitor_ids, 1) IS NULL THEN RETURN 0; END IF;
  IF array_length(_visitor_ids, 1) > 5000 THEN RAISE EXCEPTION 'Batch too large'; END IF;
  IF NOT public.is_ho_admin(v_uid) THEN
    SELECT count(*) INTO v_bad FROM unnest(_visitor_ids) vid
     WHERE NOT public.has_role_at_location(v_uid, public.visitor_location_id(vid), 'admin');
    IF v_bad > 0 THEN RAISE EXCEPTION 'Not authorised for one or more visitors' USING ERRCODE = '42501'; END IF;
  END IF;
  DELETE FROM public.visitor_agreements WHERE visitor_id = ANY(_visitor_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO public.dpdp_deletion_log(reason, agreements_deleted, actor_user_id, actor_kind, note)
  VALUES (_reason, v_count, v_uid, 'staff', left(_note, 500));
  RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.dpdp_purge_agreements_by_staff(uuid[], text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dpdp_purge_agreements_by_staff(uuid[], text, text) TO authenticated;

-- ===== 6. Atomic rate limiting =====
CREATE TABLE public.dpdp_rate_limits (
  rate_key text PRIMARY KEY,
  request_count integer NOT NULL,
  window_start timestamptz NOT NULL
);
GRANT ALL ON public.dpdp_rate_limits TO service_role;
ALTER TABLE public.dpdp_rate_limits ENABLE ROW LEVEL SECURITY; -- no policies: no client access

CREATE OR REPLACE FUNCTION public.dpdp_check_rate_limit(_key text, _max integer, _window_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer; v_now timestamptz := clock_timestamp();
BEGIN
  IF _key IS NULL OR length(_key) < 8 OR length(_key) > 200 THEN RAISE EXCEPTION 'Invalid rate key'; END IF;
  IF _max IS NULL OR _max < 1 OR _max > 10000 THEN RAISE EXCEPTION 'Invalid limit'; END IF;
  IF _window_seconds IS NULL OR _window_seconds < 1 OR _window_seconds > 86400 THEN RAISE EXCEPTION 'Invalid window'; END IF;

  INSERT INTO public.dpdp_rate_limits AS r (rate_key, request_count, window_start)
  VALUES (_key, 1, v_now)
  ON CONFLICT (rate_key) DO UPDATE SET
    request_count = CASE WHEN r.window_start + make_interval(secs => _window_seconds) <= v_now THEN 1 ELSE r.request_count + 1 END,
    window_start  = CASE WHEN r.window_start + make_interval(secs => _window_seconds) <= v_now THEN v_now ELSE r.window_start END
  RETURNING request_count INTO v_count;

  IF random() < 0.02 THEN
    DELETE FROM public.dpdp_rate_limits WHERE window_start < v_now - interval '1 day';
  END IF;
  RETURN v_count <= _max;
END $$;
REVOKE ALL ON FUNCTION public.dpdp_check_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dpdp_check_rate_limit(text, integer, integer) TO service_role;

-- ===== 7. Storage policies for private signature bucket =====
-- Files live at '<visitor uuid>/<file>.png'. Uploads happen only server-side (service role).
CREATE OR REPLACE FUNCTION public.can_view_signature_object(_user_id uuid, _name text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_vid uuid;
BEGIN
  BEGIN v_vid := split_part(_name, '/', 1)::uuid; EXCEPTION WHEN others THEN RETURN false; END;
  RETURN public.can_view_visitor_agreement(_user_id, v_vid);
END $$;

CREATE POLICY "Scoped staff read visitor signatures" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'visitor-signatures' AND public.can_view_signature_object(auth.uid(), name));
CREATE POLICY "HO admins remove visitor signatures" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'visitor-signatures' AND public.is_ho_admin(auth.uid()));