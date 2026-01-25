-- Allow public inserts for visitor self-service check-in
-- This allows unauthenticated visitors to submit their check-in request via the self-service portal
CREATE POLICY "Allow public self-service check-in" 
ON public.visitors 
FOR INSERT 
TO anon
WITH CHECK (
  -- Only allow if status is 'scheduled' (self-service submissions are scheduled, not checked_in)
  status = 'scheduled'
);