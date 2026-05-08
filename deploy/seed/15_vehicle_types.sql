-- Seed: public.vehicle_types
BEGIN;
TRUNCATE public.vehicle_types CASCADE;
INSERT INTO public.vehicle_types (id, name, description, is_active, created_at, updated_at) VALUES ('c4cdb05c-8bee-4b02-bb5a-dfde9cd75f07', 'Crane', 'Heavy lifting vehicle', true, '2026-04-14 07:33:57.909412+00', '2026-04-14 07:33:57.909412+00');
INSERT INTO public.vehicle_types (id, name, description, is_active, created_at, updated_at) VALUES ('09667e17-5396-4012-a673-fb148ce4f181', 'Car', 'Four wheeler', true, '2026-04-14 07:33:58.255392+00', '2026-04-14 07:33:58.255392+00');
INSERT INTO public.vehicle_types (id, name, description, is_active, created_at, updated_at) VALUES ('e63c6f41-d40d-4e71-90eb-93468db52e8a', 'Bike', 'Two Wheeler', true, '2026-04-14 07:33:58.556174+00', '2026-04-14 07:33:58.556174+00');
COMMIT;
