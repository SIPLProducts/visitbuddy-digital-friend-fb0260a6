-- Create public branding bucket for email assets (logo)
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read policy for branding bucket
DROP POLICY IF EXISTS "Public read for branding" ON storage.objects;
CREATE POLICY "Public read for branding"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

-- HO Admins can manage branding files
DROP POLICY IF EXISTS "HO admins can manage branding" ON storage.objects;
CREATE POLICY "HO admins can manage branding"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'branding' AND public.is_ho_admin(auth.uid()))
WITH CHECK (bucket_id = 'branding' AND public.is_ho_admin(auth.uid()));