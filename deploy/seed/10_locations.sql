-- Seed: public.locations
BEGIN;
TRUNCATE public.locations CASCADE;
INSERT INTO public.locations (id, name, address, city, country, status, gate_count, department_count, visitor_count, capacity_usage, email, phone, created_at, updated_at, latitude, longitude, geo_address, emergency_contact, assembly_point) VALUES ('2806f928-b8f6-455c-9e17-f81a728a677e', 'Corporate Office', 'Re Sustainability Limited� |� Level 11B� | �Aurobindo Galaxy�|� Hyderabad Knowledge City� | Hitech City Road� |� Hyderabad 500081 | India�', 'Hyderabad', 'India', 'active', 0, 0, 0, 0, 'frontoffice@resustainability.com', '8341155069', '2026-04-21 06:27:47.730524+00', '2026-04-21 06:32:53.650039+00', 17.43642070, 78.37573294, 'Resustainability', '9505301301', 'Ground floor Auro Galaxy');
INSERT INTO public.locations (id, name, address, city, country, status, gate_count, department_count, visitor_count, capacity_usage, email, phone, created_at, updated_at, latitude, longitude, geo_address, emergency_contact, assembly_point) VALUES ('1a9db28e-0ddb-4a93-a380-0fc904f64611', 'Sharvi Development', 'Sharvi Info Tech', 'Hyderabad', 'India', 'active', 0, 0, 0, 0, NULL, NULL, '2026-04-24 04:57:10.551727+00', '2026-04-24 04:57:10.551727+00', NULL, NULL, 'Vignan University,Vadlamudi Guntur', NULL, NULL);
INSERT INTO public.locations (id, name, address, city, country, status, gate_count, department_count, visitor_count, capacity_usage, email, phone, created_at, updated_at, latitude, longitude, geo_address, emergency_contact, assembly_point) VALUES ('1c94da1d-3e72-471b-a72a-a2554202fbf8', '3602-MWML', 'P-32, MIDC TALOJA', 'Taloja', 'India', 'active', 0, 0, 0, 0, 'hrmwml@resustainability.com', '9819980505', '2026-05-07 12:06:06.325426+00', '2026-05-07 12:06:06.325426+00', 19.09688900, 73.11530600, 'Mumbai Waste Management Limited', ' 9867589166', 'Admin Building');
INSERT INTO public.locations (id, name, address, city, country, status, gate_count, department_count, visitor_count, capacity_usage, email, phone, created_at, updated_at, latitude, longitude, geo_address, emergency_contact, assembly_point) VALUES ('013e5f3f-0fee-45a8-a1a8-c625ef9e53bb', 'HWMP', 'Sy.No:684/1,Dundigal(V),', 'Hyderabad', 'India', 'active', 0, 0, 0, 0, 'abdul.firoz@resustainability.com', '9000959530', '2026-04-14 06:55:09.531598+00', '2026-04-14 06:55:09.531598+00', 17.59319417, 78.38826085, 'Hyderabad Waste Management Project', 'NA', 'Near Admin Building');
INSERT INTO public.locations (id, name, address, city, country, status, gate_count, department_count, visitor_count, capacity_usage, email, phone, created_at, updated_at, latitude, longitude, geo_address, emergency_contact, assembly_point) VALUES ('046824dc-4324-404c-b5e7-73195fe149dd', 'C&D HYD', 'Hyderabad C&D - Fathulguda Sy No.34, Circle # 3 (Hayathnagar) Nagole, Hyderabad 500068', 'Hyderabad', 'India', 'active', 0, 0, 0, 0, 'narsimulu.n@resustainability.com', '+91 7842789023', '2026-04-17 07:08:42.083371+00', '2026-04-17 12:05:20.159562+00', NULL, NULL, 'C&D Fathulguda Hyderabad', 'na', 'Near Admin Building');
INSERT INTO public.locations (id, name, address, city, country, status, gate_count, department_count, visitor_count, capacity_usage, email, phone, created_at, updated_at, latitude, longitude, geo_address, emergency_contact, assembly_point) VALUES ('00000000-0000-0000-0000-000000000001', 'Corporate Headquarters', NULL, 'Hyderabad', 'India', 'active', 0, 0, 0, 0, 'bala@sharviinfotech.com', '+918897646530', '2026-04-14 07:14:43.516301+00', '2026-04-18 06:34:26.613576+00', NULL, NULL, NULL, NULL, NULL);

-- Backfill plant_code from name so visitor IDs don't default to 'HO-'.
-- (Mirrors deploy/backfill-plant-codes.sh — safe to re-run.)
UPDATE public.locations
SET plant_code = COALESCE(
  NULLIF(UPPER(SUBSTRING(COALESCE(name, '') FROM '^[[:space:]]*([0-9]+)')), ''),
  NULLIF(UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(name, ''), '[^a-zA-Z0-9]', '', 'g') FROM 1 FOR 6)), ''),
  'HO'
)
WHERE plant_code IS NULL OR plant_code = '';
COMMIT;
