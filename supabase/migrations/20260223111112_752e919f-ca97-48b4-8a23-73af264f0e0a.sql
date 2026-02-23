
-- Vehicle types master table
CREATE TABLE public.vehicle_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.vehicle_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vehicle types" ON public.vehicle_types
FOR SELECT USING (true);

CREATE POLICY "Admins can manage vehicle types" ON public.vehicle_types
FOR ALL USING (is_ho_admin(auth.uid()))
WITH CHECK (is_ho_admin(auth.uid()));

-- Seed with default types
INSERT INTO public.vehicle_types (name) VALUES
  ('Car'), ('Auto'), ('TATA Ace'), ('DCM'),
  ('20 Feet Container'), ('40 Feet Container'),
  ('Truck'), ('Van'), ('Pickup'), ('Trailer'),
  ('Tanker'), ('JCB'), ('Forklift'), ('Other');

-- Trigger for updated_at
CREATE TRIGGER update_vehicle_types_updated_at
BEFORE UPDATE ON public.vehicle_types
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
