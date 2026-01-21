-- Create storage bucket for visitor photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('visitor-photos', 'visitor-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload photos
CREATE POLICY "Users can upload visitor photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'visitor-photos');

-- Allow anyone to view visitor photos (since bucket is public)
CREATE POLICY "Anyone can view visitor photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'visitor-photos');

-- Allow authenticated users to update their uploads
CREATE POLICY "Users can update visitor photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'visitor-photos');

-- Allow authenticated users to delete photos
CREATE POLICY "Users can delete visitor photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'visitor-photos');