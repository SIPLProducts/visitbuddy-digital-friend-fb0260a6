-- Storage buckets used by the app
INSERT INTO storage.buckets (id, name, public)
VALUES ('visitor-photos', 'visitor-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Public read policies for those buckets
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Public read visitor-photos') THEN
    CREATE POLICY "Public read visitor-photos" ON storage.objects FOR SELECT USING (bucket_id = 'visitor-photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Auth upload visitor-photos') THEN
    CREATE POLICY "Auth upload visitor-photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'visitor-photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Anon upload visitor-photos') THEN
    CREATE POLICY "Anon upload visitor-photos" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'visitor-photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Public read branding') THEN
    CREATE POLICY "Public read branding" ON storage.objects FOR SELECT USING (bucket_id = 'branding');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Auth manage branding') THEN
    CREATE POLICY "Auth manage branding" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'branding') WITH CHECK (bucket_id = 'branding');
  END IF;
END$$;

-- Default tenant settings row (no-op if already present)
INSERT INTO public.tenant_settings (company_name)
SELECT 'VisiGuard'
WHERE NOT EXISTS (SELECT 1 FROM public.tenant_settings);