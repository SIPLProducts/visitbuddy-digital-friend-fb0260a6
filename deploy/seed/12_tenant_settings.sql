-- Seed: public.tenant_settings
BEGIN;
TRUNCATE public.tenant_settings CASCADE;
INSERT INTO public.tenant_settings (id, company_name, logo_url, primary_color, secondary_color, badge_logo_url, badge_footer_text, email_header_text, email_footer_text, nda_text, session_timeout_minutes, data_retention_days, auto_checkout_hours, enable_nda, enable_photo_capture, enable_watchlist_check, created_at, updated_at, whatsapp_provider) VALUES ('8a9679eb-79dd-437b-9161-801578f7dcf7', 'VisiGuard', NULL, '#0ea5e9', '#10b981', NULL, 'Thank you for visiting', 'Welcome to our facility', 'This is an automated message', 'I agree to comply with all facility security policies and procedures. I understand that I must wear my visitor badge at all times and follow all safety regulations during my visit.', 30, 30, 12, true, true, true, '2026-03-30 23:53:55.489697+00', '2026-03-30 23:53:55.489697+00', 'whatsapp_web');
COMMIT;
