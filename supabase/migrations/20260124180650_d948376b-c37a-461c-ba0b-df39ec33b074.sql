-- Add a policy to allow public read access to visitors for badge printing
-- This is safe because visitor data is not sensitive and is meant to be printed/shared

CREATE POLICY "Allow public read for badge printing" 
ON public.visitors 
FOR SELECT 
USING (true);