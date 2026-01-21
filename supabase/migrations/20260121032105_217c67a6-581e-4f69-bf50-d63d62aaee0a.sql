-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'operator');

-- Create user_location_roles table for location-specific roles
CREATE TABLE public.user_location_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'operator',
    is_ho_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, location_id)
);

-- Enable RLS
ALTER TABLE public.user_location_roles ENABLE ROW LEVEL SECURITY;

-- Add location_id to profiles table for default/primary location
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_location_id UUID REFERENCES public.locations(id);

-- Create security definer function to check if user has role at location
CREATE OR REPLACE FUNCTION public.has_role_at_location(_user_id UUID, _location_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_location_roles
        WHERE user_id = _user_id
          AND location_id = _location_id
          AND role = _role
    )
$$;

-- Create function to check if user is HO admin (can see all locations)
CREATE OR REPLACE FUNCTION public.is_ho_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_location_roles
        WHERE user_id = _user_id
          AND is_ho_admin = true
    )
$$;

-- Create function to get user's accessible location IDs
CREATE OR REPLACE FUNCTION public.get_user_location_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT location_id
    FROM public.user_location_roles
    WHERE user_id = _user_id
$$;

-- Create function to check if user can access a specific location
CREATE OR REPLACE FUNCTION public.can_access_location(_user_id UUID, _location_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        public.is_ho_admin(_user_id) 
        OR EXISTS (
            SELECT 1
            FROM public.user_location_roles
            WHERE user_id = _user_id
              AND location_id = _location_id
        )
$$;

-- RLS Policies for user_location_roles
CREATE POLICY "Users can view their own roles"
ON public.user_location_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_ho_admin(auth.uid()));

CREATE POLICY "HO Admins can manage all roles"
ON public.user_location_roles
FOR ALL
TO authenticated
USING (public.is_ho_admin(auth.uid()))
WITH CHECK (public.is_ho_admin(auth.uid()));

-- Update visitors table to enforce location-based access
DROP POLICY IF EXISTS "Authenticated users can view visitors" ON public.visitors;
CREATE POLICY "Users can view visitors at their locations"
ON public.visitors
FOR SELECT
TO authenticated
USING (
    public.is_ho_admin(auth.uid()) 
    OR gate_id IN (
        SELECT g.id FROM public.gates g 
        WHERE g.location_id IN (SELECT public.get_user_location_ids(auth.uid()))
    )
    OR gate_id IS NULL
);

DROP POLICY IF EXISTS "Authenticated users can insert visitors" ON public.visitors;
CREATE POLICY "Users can insert visitors at their locations"
ON public.visitors
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_ho_admin(auth.uid()) 
    OR gate_id IN (
        SELECT g.id FROM public.gates g 
        WHERE g.location_id IN (SELECT public.get_user_location_ids(auth.uid()))
    )
    OR gate_id IS NULL
);

DROP POLICY IF EXISTS "Authenticated users can update visitors" ON public.visitors;
CREATE POLICY "Users can update visitors at their locations"
ON public.visitors
FOR UPDATE
TO authenticated
USING (
    public.is_ho_admin(auth.uid()) 
    OR gate_id IN (
        SELECT g.id FROM public.gates g 
        WHERE g.location_id IN (SELECT public.get_user_location_ids(auth.uid()))
    )
    OR gate_id IS NULL
);

DROP POLICY IF EXISTS "Authenticated users can delete visitors" ON public.visitors;
CREATE POLICY "Managers and Admins can delete visitors at their locations"
ON public.visitors
FOR DELETE
TO authenticated
USING (
    public.is_ho_admin(auth.uid()) 
    OR (
        gate_id IN (
            SELECT g.id FROM public.gates g 
            WHERE g.location_id IN (
                SELECT location_id FROM public.user_location_roles 
                WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
            )
        )
    )
);

-- Update gates table RLS for location-based access
DROP POLICY IF EXISTS "Authenticated users can view gates" ON public.gates;
CREATE POLICY "Users can view gates at their locations"
ON public.gates
FOR SELECT
TO authenticated
USING (
    public.is_ho_admin(auth.uid()) 
    OR location_id IN (SELECT public.get_user_location_ids(auth.uid()))
    OR location_id IS NULL
);

DROP POLICY IF EXISTS "Authenticated users can insert gates" ON public.gates;
CREATE POLICY "Admins can insert gates at their locations"
ON public.gates
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_ho_admin(auth.uid()) 
    OR location_id IN (
        SELECT location_id FROM public.user_location_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

DROP POLICY IF EXISTS "Authenticated users can update gates" ON public.gates;
CREATE POLICY "Admins can update gates at their locations"
ON public.gates
FOR UPDATE
TO authenticated
USING (
    public.is_ho_admin(auth.uid()) 
    OR location_id IN (
        SELECT location_id FROM public.user_location_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

DROP POLICY IF EXISTS "Authenticated users can delete gates" ON public.gates;
CREATE POLICY "Admins can delete gates at their locations"
ON public.gates
FOR DELETE
TO authenticated
USING (
    public.is_ho_admin(auth.uid()) 
    OR location_id IN (
        SELECT location_id FROM public.user_location_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Update locations table RLS
DROP POLICY IF EXISTS "Authenticated users can view locations" ON public.locations;
CREATE POLICY "Users can view their assigned locations"
ON public.locations
FOR SELECT
TO authenticated
USING (
    public.is_ho_admin(auth.uid()) 
    OR id IN (SELECT public.get_user_location_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Authenticated users can insert locations" ON public.locations;
CREATE POLICY "HO Admins can insert locations"
ON public.locations
FOR INSERT
TO authenticated
WITH CHECK (public.is_ho_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update locations" ON public.locations;
CREATE POLICY "HO Admins can update locations"
ON public.locations
FOR UPDATE
TO authenticated
USING (public.is_ho_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can delete locations" ON public.locations;
CREATE POLICY "HO Admins can delete locations"
ON public.locations
FOR DELETE
TO authenticated
USING (public.is_ho_admin(auth.uid()));

-- Update appointments table RLS for location-based access
DROP POLICY IF EXISTS "Authenticated users can view appointments" ON public.appointments;
CREATE POLICY "Users can view appointments at their locations"
ON public.appointments
FOR SELECT
TO authenticated
USING (
    public.is_ho_admin(auth.uid())
    OR department_id IN (
        SELECT d.id FROM public.departments d
        WHERE d.location IN (
            SELECT l.name FROM public.locations l
            WHERE l.id IN (SELECT public.get_user_location_ids(auth.uid()))
        )
    )
    OR department_id IS NULL
);

DROP POLICY IF EXISTS "Authenticated users can insert appointments" ON public.appointments;
CREATE POLICY "Users can insert appointments"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update appointments" ON public.appointments;
CREATE POLICY "Users can update appointments at their locations"
ON public.appointments
FOR UPDATE
TO authenticated
USING (
    public.is_ho_admin(auth.uid())
    OR department_id IN (
        SELECT d.id FROM public.departments d
        WHERE d.location IN (
            SELECT l.name FROM public.locations l
            WHERE l.id IN (SELECT public.get_user_location_ids(auth.uid()))
        )
    )
    OR department_id IS NULL
);

DROP POLICY IF EXISTS "Authenticated users can delete appointments" ON public.appointments;
CREATE POLICY "Managers and Admins can delete appointments"
ON public.appointments
FOR DELETE
TO authenticated
USING (
    public.is_ho_admin(auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.user_location_roles
        WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
);

-- Create trigger for updated_at
CREATE TRIGGER update_user_location_roles_updated_at
BEFORE UPDATE ON public.user_location_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();