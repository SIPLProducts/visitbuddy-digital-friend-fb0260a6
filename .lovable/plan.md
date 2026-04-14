
# Fix Bala's HO Admin Role (Again) + Permanent Safeguard

## Root cause confirmed
`user_location_roles.location_id` previously had `ON DELETE CASCADE`. When you deleted the locations that Bala's role was linked to, the database automatically deleted Bala's role row too. The migration to change this to `RESTRICT` was applied, but **after** the damage was done.

The RESTRICT constraint is now active — so going forward, trying to delete a location that has role assignments will fail with an error instead of silently deleting roles.

## Plan

### 1. Re-insert Bala as HO Admin
Insert one row into `user_location_roles` linking Bala to "Corporate Headquarters" (which still exists) with `role = 'admin'` and `is_ho_admin = true`.

### 2. Improve the Location deletion UI
Update `src/pages/Locations.tsx` so that when a user tries to delete a location, it first checks if any roles are assigned to that location and warns the user before attempting deletion. This prevents the confusing RESTRICT error from the database.

### 3. No other changes needed
The FK is already RESTRICT. The `is_ho_admin` function, `useUserRoles` hook, and Header display are all working correctly — they just need data to work with.

## Technical detail
The link: `user_location_roles.location_id → locations.id`. Every role assignment is tied to a specific location. If that location disappears, the role disappears (old CASCADE) or the deletion is blocked (new RESTRICT).
