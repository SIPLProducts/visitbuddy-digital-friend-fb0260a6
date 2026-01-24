-- Add public read access policies for badge printing joins
-- These are needed because the print badge page queries visitor with host and department info

CREATE POLICY "Allow public read for badge printing" 
ON public.employees 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public read for badge printing" 
ON public.departments 
FOR SELECT 
USING (true);