-- Add evacuation assembly point to locations
ALTER TABLE public.locations 
ADD COLUMN assembly_point TEXT;