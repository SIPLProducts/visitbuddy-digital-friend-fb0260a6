
-- Drop existing FK and re-add with RESTRICT instead of CASCADE
ALTER TABLE public.user_location_roles
  DROP CONSTRAINT IF EXISTS user_location_roles_location_id_fkey;

ALTER TABLE public.user_location_roles
  ADD CONSTRAINT user_location_roles_location_id_fkey
  FOREIGN KEY (location_id) REFERENCES public.locations(id)
  ON DELETE RESTRICT;
