-- READ-ONLY pre-application schema/policy validation; run in production/staging SQL editor.
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('dpdp_privacy_notices', 'visitor_agreements')
ORDER BY table_name, ordinal_position;

SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('dpdp_privacy_notices', 'visitor_agreements')
ORDER BY tablename, policyname;

SELECT id, location_id, language, version, title, is_active, approved_by, approved_at
FROM public.dpdp_privacy_notices
WHERE is_active = true
ORDER BY location_id NULLS FIRST, language, version;

-- Confirm the 14 proposed migration columns do not already exist.
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND ((table_name = 'dpdp_privacy_notices' AND column_name IN (
    'acknowledgement_1_text', 'acknowledgement_2_text', 'acknowledgement_3_text', 'acknowledgement_4_text',
    'privacy_policy_url', 'terms_of_service_url'
  )) OR (table_name = 'visitor_agreements' AND column_name IN (
    'acknowledgement_1', 'acknowledgement_1_at', 'acknowledgement_2', 'acknowledgement_2_at',
    'acknowledgement_3', 'acknowledgement_3_at', 'acknowledgement_4', 'acknowledgement_4_at'
  )))
ORDER BY table_name, column_name;
