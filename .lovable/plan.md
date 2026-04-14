

# Fix: Infinite Recursion in `user_location_roles` RLS Policy

## Root Cause
The newly added policy "Location admins can view roles at their locations" contains a subquery `SELECT ulr.location_id FROM public.user_location_roles ulr WHERE ...` — this references the same table, triggering RLS evaluation recursively.

## Fix

### 1. Create a SECURITY DEFINER function to get admin location IDs
A `SECURITY DEFINER` function bypasses RLS, breaking the recursion cycle:

```sql
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
```

### 2. Replace the recursive SELECT policy
Drop the old policy and create a new one using the function:

```sql
DROP POLICY "Location admins can view roles at their locations" ON public.user_location_roles;

CREATE POLICY "Location admins can view roles at their locations"
  ON public.user_location_roles FOR SELECT TO authenticated
  USING (
    location_id IN (SELECT public.get_admin_location_ids(auth.uid()))
  );
```

### 3. Keep Bala@sharviinfotech as HO Admin — no changes needed
The existing "HO Admins can manage all roles" and "Users can view their own roles" policies remain untouched. HO Admin access is unaffected.

## Files affected
- Database migration only (one new function + one policy replacement)

