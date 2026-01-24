-- Add emergency contact number to locations
ALTER TABLE public.locations 
ADD COLUMN emergency_contact TEXT;