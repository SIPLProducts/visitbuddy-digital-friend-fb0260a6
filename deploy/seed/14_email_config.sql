-- Seed: public.email_config
BEGIN;
TRUNCATE public.email_config CASCADE;
INSERT INTO public.email_config (id, smtp_host, smtp_port, smtp_username, smtp_password, sender_name, sender_email, use_tls, created_at, updated_at, is_active) VALUES ('6ee1fc73-db57-4fd6-b35f-e805922f2125', 'smtp.gmail.com', 587, 'visitor@resustainability.com', 'boyqqqawdyazxzug', 'RESL-VMS', 'visitor@resustainability.com', true, '2026-04-14 06:54:09.750272+00', '2026-04-20 09:32:39.897681+00', true);
COMMIT;
