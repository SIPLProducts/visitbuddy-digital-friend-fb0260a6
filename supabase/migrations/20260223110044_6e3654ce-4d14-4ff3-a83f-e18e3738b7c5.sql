
-- 1. Accompanying visitors table
CREATE TABLE public.accompanying_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  has_laptop boolean DEFAULT false,
  laptop_brand text,
  laptop_serial text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.accompanying_visitors ENABLE ROW LEVEL SECURITY;

-- RLS policies for accompanying_visitors (mirror visitors patterns)
CREATE POLICY "Public read for accompanying visitors"
ON public.accompanying_visitors FOR SELECT
USING (true);

CREATE POLICY "Users can insert accompanying visitors"
ON public.accompanying_visitors FOR INSERT
WITH CHECK (
  visitor_id IN (SELECT id FROM public.visitors)
);

CREATE POLICY "Users can update accompanying visitors"
ON public.accompanying_visitors FOR UPDATE
USING (
  visitor_id IN (SELECT id FROM public.visitors)
);

CREATE POLICY "Users can delete accompanying visitors"
ON public.accompanying_visitors FOR DELETE
USING (
  visitor_id IN (SELECT id FROM public.visitors)
);

-- 2. Vehicle table additions
ALTER TABLE public.vehicles
  ADD COLUMN driver_license text,
  ADD COLUMN department_id uuid REFERENCES public.departments(id),
  ADD COLUMN is_employee_vehicle boolean DEFAULT false,
  ADD COLUMN employee_id uuid REFERENCES public.employees(id),
  ADD COLUMN auto_allow boolean DEFAULT false;
