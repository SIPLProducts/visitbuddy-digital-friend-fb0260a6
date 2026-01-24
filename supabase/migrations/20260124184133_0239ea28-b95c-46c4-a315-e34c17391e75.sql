-- Add floor and building section fields to departments
ALTER TABLE public.departments 
ADD COLUMN floor_number TEXT,
ADD COLUMN building_section TEXT;