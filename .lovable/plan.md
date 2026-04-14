

# Allow Location Admins to Manage Users at Their Locations

## Problem
Currently, only HO Admins can access User Management. Location Admins (users with `role = 'admin'` at a specific location) should also be able to create users and assign them roles, but scoped only to their own location(s).

## Plan

### 1. Update frontend access control in `UserManagement.tsx`
- Import `userRoles` from `useUserRoles()` alongside `isHoAdmin`
- Compute `isLocationAdmin` — true if user has `role === 'admin'` at any location
- Change the access gate (line 652) from `!isHoAdmin` to `!isHoAdmin && !isLocationAdmin`
- Compute `accessibleLocations` — for HO Admin: all locations; for Location Admin: only locations where they have `admin` role
- Use `accessibleLocations` instead of `locations` in all location dropdowns (create role, assign user, edit role)
- Hide the "HO Admin" checkbox for Location Admins (only HO Admins can create other HO Admins)
- Filter the displayed `userRoles` table to only show roles at the Location Admin's locations

### 2. Update RLS policies on `user_location_roles`
Add policies so Location Admins can INSERT/UPDATE/DELETE roles scoped to their own locations:

```sql
-- Location Admins can insert roles at their locations
CREATE POLICY "Location admins can insert roles at their locations"
  ON public.user_location_roles FOR INSERT TO authenticated
  WITH CHECK (
    has_role_at_location(auth.uid(), location_id, 'admin')
    AND is_ho_admin = false
  );

-- Location Admins can view roles at their locations
CREATE POLICY "Location admins can view roles at their locations"
  ON public.user_location_roles FOR SELECT TO authenticated
  USING (
    location_id IN (
      SELECT ulr.location_id FROM public.user_location_roles ulr
      WHERE ulr.user_id = auth.uid() AND ulr.role = 'admin'
    )
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
```

### 3. Update RLS on `profiles` table
Location Admins also need to see all profiles to populate the "Assign User" dropdown:

```sql
CREATE POLICY "Location admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_location_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

### 4. Update RLS on `role_screen_permissions`
Location Admins need to manage screen permissions at their locations:

```sql
CREATE POLICY "Location admins can manage permissions at their locations"
  ON public.role_screen_permissions FOR ALL TO authenticated
  USING (
    has_role_at_location(auth.uid(), location_id, 'admin')
  )
  WITH CHECK (
    has_role_at_location(auth.uid(), location_id, 'admin')
  );
```

### 5. Update `useUserRoles` hook
- Export a new computed `isLocationAdmin` boolean (true if any role === 'admin')

## Security guardrails
- Location Admins **cannot** set `is_ho_admin = true` (enforced in both RLS and frontend)
- Location Admins can only manage roles at their assigned locations
- The `has_role_at_location` security definer function already exists and avoids RLS recursion

## Files affected
- `src/pages/UserManagement.tsx` — access gate, scoped location lists, hide HO Admin checkbox
- `src/hooks/useUserRoles.ts` — add `isLocationAdmin` computed property
- Database migration — 5 new RLS policies across `user_location_roles`, `profiles`, `role_screen_permissions`

