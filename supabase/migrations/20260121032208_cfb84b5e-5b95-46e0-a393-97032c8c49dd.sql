-- Fix the appointments insert policy to be location-aware instead of always true
DROP POLICY IF EXISTS "Users can insert appointments" ON public.appointments;
CREATE POLICY "Users can insert appointments at their locations"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_ho_admin(auth.uid())
    OR department_id IS NULL
    OR department_id IN (
        SELECT d.id FROM public.departments d
        WHERE d.location_id IN (SELECT public.get_user_location_ids(auth.uid()))
        OR d.location_id IS NULL
    )
);