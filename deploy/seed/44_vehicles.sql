-- Seed: public.vehicles (transactional, regenerate before import)
BEGIN;
TRUNCATE public.vehicles CASCADE;
INSERT INTO public.vehicles (id, vehicle_id, vehicle_number, vehicle_type, driver_name, driver_phone, company, purpose, status, check_in_time, check_out_time, gate_id, location_id, qr_code, created_at, updated_at, driver_license, department_id, is_employee_vehicle, employee_id, auto_allow) VALUES ('d41b80ab-a5c0-4790-89b7-a5e96b3a4723', 'VEH-66D90A0F-964E', 'TS 21 7903', 'Bike', 'Sunil kumar', '7989328372', 'Sharvi info tech', 'Delivery laptop', 'checked_out', '2026-04-24 06:43:48.48+00', '2026-05-08 10:39:40.763+00', '7932f688-fde0-4c7d-8359-78a33a183177', '013e5f3f-0fee-45a8-a1a8-c625ef9e53bb', NULL, '2026-04-14 09:17:08.255792+00', '2026-05-08 10:37:23.911919+00', 'Dl-123456789', 'f3afa501-3c40-443c-8ed6-05f648e5c71a', false, NULL, false);
COMMIT;
