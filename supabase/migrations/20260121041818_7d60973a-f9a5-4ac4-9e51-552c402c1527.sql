-- Create vehicles table for commercial vehicle registration
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id TEXT NOT NULL UNIQUE,
  vehicle_number TEXT NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'Truck',
  driver_name TEXT NOT NULL,
  driver_phone TEXT,
  company TEXT,
  purpose TEXT,
  status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'checked_in', 'checked_out')),
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  gate_id UUID REFERENCES public.gates(id),
  location_id UUID REFERENCES public.locations(id),
  qr_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- RLS policies matching the existing location-based access pattern
CREATE POLICY "Users can view vehicles at their locations"
ON public.vehicles FOR SELECT
USING (
  is_ho_admin(auth.uid()) 
  OR (location_id IN (SELECT get_user_location_ids(auth.uid())))
  OR (location_id IS NULL)
);

CREATE POLICY "Users can insert vehicles at their locations"
ON public.vehicles FOR INSERT
WITH CHECK (
  is_ho_admin(auth.uid()) 
  OR (location_id IN (SELECT get_user_location_ids(auth.uid())))
  OR (location_id IS NULL)
);

CREATE POLICY "Users can update vehicles at their locations"
ON public.vehicles FOR UPDATE
USING (
  is_ho_admin(auth.uid()) 
  OR (location_id IN (SELECT get_user_location_ids(auth.uid())))
  OR (location_id IS NULL)
);

CREATE POLICY "Managers and Admins can delete vehicles"
ON public.vehicles FOR DELETE
USING (
  is_ho_admin(auth.uid()) 
  OR (location_id IN (
    SELECT location_id FROM user_location_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  ))
);

-- Trigger for updated_at
CREATE TRIGGER update_vehicles_updated_at
BEFORE UPDATE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate vehicle ID
CREATE OR REPLACE FUNCTION public.generate_vehicle_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
    NEW.vehicle_id = 'VEH-' || UPPER(SUBSTRING(MD5(gen_random_uuid()::text) FOR 8)) || '-' || UPPER(SUBSTRING(MD5(gen_random_uuid()::text) FOR 4));
    RETURN NEW;
END;
$function$;

-- Create index for faster lookups
CREATE INDEX idx_vehicles_vehicle_number ON public.vehicles(vehicle_number);
CREATE INDEX idx_vehicles_status ON public.vehicles(status);
CREATE INDEX idx_vehicles_location_id ON public.vehicles(location_id);