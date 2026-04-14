CREATE POLICY "HO Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (is_ho_admin(auth.uid()));