
-- 1. Add is_admin_head flag
ALTER TABLE public.user_location_roles
  ADD COLUMN IF NOT EXISTS is_admin_head boolean NOT NULL DEFAULT false;

-- 2. Helper function
CREATE OR REPLACE FUNCTION public.is_admin_head(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_location_roles
    WHERE user_id = _user_id AND is_admin_head = true
  )
$$;

-- 3. Open SELECT RLS for Admin Head on every tenant table (additive policies)
-- visitors
CREATE POLICY "Admin Head can view all visitors" ON public.visitors
  FOR SELECT TO authenticated USING (public.is_admin_head(auth.uid()));

-- accompanying_visitors already public read

-- vehicles
CREATE POLICY "Admin Head can view all vehicles" ON public.vehicles
  FOR SELECT USING (public.is_admin_head(auth.uid()));

-- vehicle_entries
CREATE POLICY "Admin Head can view all vehicle entries" ON public.vehicle_entries
  FOR SELECT USING (public.is_admin_head(auth.uid()));

-- anpr_events
CREATE POLICY "Admin Head can view all anpr events" ON public.anpr_events
  FOR SELECT TO authenticated USING (public.is_admin_head(auth.uid()));

-- appointments
CREATE POLICY "Admin Head can view all appointments" ON public.appointments
  FOR SELECT TO authenticated USING (public.is_admin_head(auth.uid()));

-- audit_logs
CREATE POLICY "Admin Head can view all audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.is_admin_head(auth.uid()));

-- sms_logs
CREATE POLICY "Admin Head can view all sms logs" ON public.sms_logs
  FOR SELECT TO authenticated USING (public.is_admin_head(auth.uid()));

-- departments
CREATE POLICY "Admin Head can view all departments" ON public.departments
  FOR SELECT TO authenticated USING (public.is_admin_head(auth.uid()));

-- employees
CREATE POLICY "Admin Head can view all employees" ON public.employees
  FOR SELECT TO authenticated USING (public.is_admin_head(auth.uid()));

-- gates
CREATE POLICY "Admin Head can view all gates" ON public.gates
  FOR SELECT TO authenticated USING (public.is_admin_head(auth.uid()));

-- locations
CREATE POLICY "Admin Head can view all locations" ON public.locations
  FOR SELECT TO authenticated USING (public.is_admin_head(auth.uid()));

-- profiles
CREATE POLICY "Admin Head can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin_head(auth.uid()));

-- user_location_roles
CREATE POLICY "Admin Head can view all roles" ON public.user_location_roles
  FOR SELECT TO authenticated USING (public.is_admin_head(auth.uid()));

-- visitor_watchlist already auth-wide select

-- 4. Tighten user_location_roles writes: location admins cannot set is_admin_head=true
DROP POLICY IF EXISTS "Location admins can insert roles at their locations" ON public.user_location_roles;
CREATE POLICY "Location admins can insert roles at their locations" ON public.user_location_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role_at_location(auth.uid(), location_id, 'admin'::app_role)
    AND is_ho_admin = false
    AND is_admin_head = false
  );

DROP POLICY IF EXISTS "Location admins can update roles at their locations" ON public.user_location_roles;
CREATE POLICY "Location admins can update roles at their locations" ON public.user_location_roles
  FOR UPDATE TO authenticated
  USING (
    public.has_role_at_location(auth.uid(), location_id, 'admin'::app_role)
    AND is_ho_admin = false
    AND is_admin_head = false
  );
