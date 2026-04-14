
-- Location Admins can view roles at their locations
CREATE POLICY "Location admins can view roles at their locations"
  ON public.user_location_roles FOR SELECT TO authenticated
  USING (
    location_id IN (
      SELECT ulr.location_id FROM public.user_location_roles ulr
      WHERE ulr.user_id = auth.uid() AND ulr.role = 'admin'
    )
  );

-- Location Admins can insert roles at their locations (cannot set is_ho_admin)
CREATE POLICY "Location admins can insert roles at their locations"
  ON public.user_location_roles FOR INSERT TO authenticated
  WITH CHECK (
    has_role_at_location(auth.uid(), location_id, 'admin')
    AND is_ho_admin = false
  );

-- Location Admins can update roles at their locations (cannot set is_ho_admin)
CREATE POLICY "Location admins can update roles at their locations"
  ON public.user_location_roles FOR UPDATE TO authenticated
  USING (
    has_role_at_location(auth.uid(), location_id, 'admin')
    AND is_ho_admin = false
  );

-- Location Admins can delete roles at their locations
CREATE POLICY "Location admins can delete roles at their locations"
  ON public.user_location_roles FOR DELETE TO authenticated
  USING (
    has_role_at_location(auth.uid(), location_id, 'admin')
    AND is_ho_admin = false
  );

-- Location Admins can view all profiles (for assign user dropdown)
CREATE POLICY "Location admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_location_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Location Admins can manage screen permissions at their locations
CREATE POLICY "Location admins can manage permissions at their locations"
  ON public.role_screen_permissions FOR ALL TO authenticated
  USING (
    has_role_at_location(auth.uid(), location_id, 'admin')
  )
  WITH CHECK (
    has_role_at_location(auth.uid(), location_id, 'admin')
  );
