
-- 1. Create SECURITY DEFINER function to get admin location IDs (breaks recursion)
CREATE OR REPLACE FUNCTION public.get_admin_location_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT location_id
  FROM public.user_location_roles
  WHERE user_id = _user_id AND role = 'admin'
$$;

-- 2. Drop the recursive policy
DROP POLICY "Location admins can view roles at their locations" ON public.user_location_roles;

-- 3. Recreate using the function
CREATE POLICY "Location admins can view roles at their locations"
  ON public.user_location_roles FOR SELECT TO authenticated
  USING (
    location_id IN (SELECT public.get_admin_location_ids(auth.uid()))
  );
