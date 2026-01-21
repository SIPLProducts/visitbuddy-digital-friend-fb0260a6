-- Add geolocation fields to locations table for badge display
ALTER TABLE public.locations 
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8),
ADD COLUMN geo_address TEXT;