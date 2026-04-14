<final-text>## What I found

- `public.locations` inserts are allowed only when `public.is_ho_admin(auth.uid())` is true.
- `public.email_config` create/update/delete is also protected by the same HO-admin check.
- `src/pages/Locations.tsx` is already role-aware and only shows Add/Import/Edit/Delete for `isHoAdmin`.
- `src/pages/Settings.tsx` is not role-aware in the UI yet; it always attempts the write and only shows the backend RLS error afterward.

Because both Location creation and Email Configuration saving are failing after you re-logged in, the real problem is still that the live backend is not recognizing the currently signed-in Bala session as HO Admin.

## Plan

### 1. Verify the live HO-admin identity
Check the exact current signed-in Bala user id from the active session, then verify in the backend:
- the matching row in `public.user_location_roles`
- that the linked `location_id` still exists
- that `public.is_ho_admin(<current_user_id>)` returns `true`

This is important because the earlier HO-admin change may have been applied to the wrong user id, not persisted, or attached to a location that no longer exists.

### 2. Fix the backend role assignment
Apply a data fix for the exact current Bala account:
- insert or update one `user_location_roles` row
- set `role = 'admin'`
- set `is_ho_admin = true`
- attach it to a valid existing location

If the live policies differ from the migration files, I’ll also correct the RLS policy; otherwise I’ll keep the security rules unchanged.

### 3. Improve the Settings page UX
Update `src/pages/Settings.tsx` to use `useUserRoles()` so the page matches backend permissions:
- disable or hide Save/Delete/Test Email actions for non-HO admins
- show a clear inline message like “Only HO Admins can manage email configuration”
- avoid showing raw RLS failure toasts for expected permission blocks

### 4. Add a small permission/loading guard
Tighten admin-only actions so they wait for role data before rendering or submitting:
- confirm HO-admin status before location add/import actions
- confirm HO-admin status before email config save/delete/test actions

### 5. Verify end-to-end
After the role fix:
- sign in as Bala
- confirm the header shows HO Admin
- create a location
- save email configuration
- log out and log back in once more
- if it still fails even though `is_ho_admin()` is true, inspect the exact request/logs for a stale-session mismatch

## Files / data likely involved

- Backend data: `public.user_location_roles`
- Backend policy audit: `public.locations`, `public.email_config`
- Frontend: `src/pages/Settings.tsx`
- Minor guard adjustments only if needed: `src/pages/Locations.tsx`

## Technical note

I do not want to weaken the security model. Both features are already designed to work only for HO Admins, so the correct fix is to make sure the current Bala session is truly recognized as HO Admin by the backend, then make the UI reflect that clearly.</final-text>