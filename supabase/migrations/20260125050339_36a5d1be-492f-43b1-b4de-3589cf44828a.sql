-- Update the self-service RLS policy to allow 'pending_approval' status
DROP POLICY IF EXISTS "Allow public self-service check-in" ON public.visitors;

CREATE POLICY "Allow public self-service check-in" 
ON public.visitors 
FOR INSERT 
TO anon
WITH CHECK (status IN ('scheduled', 'pending_approval'));

-- Allow public updates for approval workflow (only changing status from pending_approval to scheduled)
CREATE POLICY "Allow public approval updates" 
ON public.visitors 
FOR UPDATE 
TO anon
USING (status = 'pending_approval')
WITH CHECK (status = 'scheduled');