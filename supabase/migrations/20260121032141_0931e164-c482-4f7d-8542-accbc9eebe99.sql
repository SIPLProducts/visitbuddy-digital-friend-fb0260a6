-- Add location_id to departments table for proper location-based access
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id);

-- Update departments RLS policies
DROP POLICY IF EXISTS "Authenticated users can view departments" ON public.departments;
CREATE POLICY "Users can view departments at their locations"
ON public.departments
FOR SELECT
TO authenticated
USING (
    public.is_ho_admin(auth.uid()) 
    OR location_id IN (SELECT public.get_user_location_ids(auth.uid()))
    OR location_id IS NULL
);

DROP POLICY IF EXISTS "Authenticated users can insert departments" ON public.departments;
CREATE POLICY "Admins can insert departments at their locations"
ON public.departments
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_ho_admin(auth.uid()) 
    OR location_id IN (
        SELECT location_id FROM public.user_location_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

DROP POLICY IF EXISTS "Authenticated users can update departments" ON public.departments;
CREATE POLICY "Admins can update departments at their locations"
ON public.departments
FOR UPDATE
TO authenticated
USING (
    public.is_ho_admin(auth.uid()) 
    OR location_id IN (
        SELECT location_id FROM public.user_location_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

DROP POLICY IF EXISTS "Authenticated users can delete departments" ON public.departments;
CREATE POLICY "Admins can delete departments at their locations"
ON public.departments
FOR DELETE
TO authenticated
USING (
    public.is_ho_admin(auth.uid()) 
    OR location_id IN (
        SELECT location_id FROM public.user_location_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Add location_id to employees table  
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id);

-- Update employees RLS policies
DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.employees;
CREATE POLICY "Users can view employees at their locations"
ON public.employees
FOR SELECT
TO authenticated
USING (
    public.is_ho_admin(auth.uid()) 
    OR location_id IN (SELECT public.get_user_location_ids(auth.uid()))
    OR location_id IS NULL
);

DROP POLICY IF EXISTS "Authenticated users can insert employees" ON public.employees;
CREATE POLICY "Admins can insert employees at their locations"
ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_ho_admin(auth.uid()) 
    OR location_id IN (
        SELECT location_id FROM public.user_location_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

DROP POLICY IF EXISTS "Authenticated users can update employees" ON public.employees;
CREATE POLICY "Managers and Admins can update employees at their locations"
ON public.employees
FOR UPDATE
TO authenticated
USING (
    public.is_ho_admin(auth.uid()) 
    OR location_id IN (
        SELECT location_id FROM public.user_location_roles 
        WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
);

DROP POLICY IF EXISTS "Authenticated users can delete employees" ON public.employees;
CREATE POLICY "Admins can delete employees at their locations"
ON public.employees
FOR DELETE
TO authenticated
USING (
    public.is_ho_admin(auth.uid()) 
    OR location_id IN (
        SELECT location_id FROM public.user_location_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Fix notifications insert policy to be more restrictive
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_ho_admin(auth.uid()));