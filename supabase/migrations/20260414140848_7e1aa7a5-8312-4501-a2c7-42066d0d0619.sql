CREATE POLICY "Allow anonymous visitor photo uploads"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'visitor-photos');