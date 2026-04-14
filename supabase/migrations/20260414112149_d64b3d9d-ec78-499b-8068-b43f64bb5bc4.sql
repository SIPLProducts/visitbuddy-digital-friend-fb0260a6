CREATE POLICY "Allow public read for badge printing" 
ON public.gates FOR SELECT TO public USING (true);

CREATE POLICY "Allow public read for badge printing" 
ON public.locations FOR SELECT TO public USING (true);