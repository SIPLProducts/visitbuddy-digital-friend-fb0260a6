ALTER TABLE public.visitors ADD COLUMN vehicle_type text DEFAULT 'by_walk';
ALTER TABLE public.visitors ADD COLUMN vehicle_number text;