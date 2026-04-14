
## What I found

- I checked the Locations page and the backend access rules.
- `src/pages/Locations.tsx` already has the improved error toast and the form scrollbar fix.
- The remaining problem is permission-related:
  - the page still shows **Add / Import / Edit / Delete** actions to everyone
  - but the backend rule for creating locations only allows **HO Admins**
- The current backend policy on `locations` is:
  - `INSERT` allowed only when `is_ho_admin(auth.uid()) = true`
- I also checked the current role data:
  - there are **existing locations** in the database
  - there are **no HO Admin role rows** right now for the current setup
- So the add-location request is being rejected correctly by backend security.

## Plan

### 1. Fix the actual permission issue in backend data
- Confirm the currently signed-in user’s ID.
- Update the existing role record for that user to HO Admin, or create one if none exists.
- Set:
  - `role = 'admin'`
  - `is_ho_admin = true`
  - attach it to one existing location (since `location_id` is required and locations already exist)
- Do this as a **data update**, not a schema migration.

### 2. Fix the Locations UI so it matches the permission model
Update `src/pages/Locations.tsx` to use the existing `useUserRoles()` hook and make the page permission-aware:
- show **Add Location** only for HO Admins
- hide/disable **Import CSV**
- hide/disable **Edit** and **Delete**
- handle the empty-state “Add Your First Location” button the same way

### 3. Add client-side guards for safer UX
Even with backend security kept in place, add early checks in:
- `handleAdd`
- `handleEdit`
- `handleDelete`
- `handleFileUpload`

If the user is not HO Admin, show a clear message like:
- “Only HO Admins can manage locations.”

This avoids confusing backend permission errors in normal use.

### 4. Verify end-to-end
After the role update:
- refresh or sign in again
- test adding a location
- test editing and deleting
- test CSV import
- confirm non-HO users now get read-only behavior instead of failed actions

## Files / data to change

- Backend data: `public.user_location_roles`
- Frontend: `src/pages/Locations.tsx`

## Technical details

- Current insert rule on `public.locations`:
  - `WITH CHECK (public.is_ho_admin(auth.uid()))`
- Current role lookup result shows no HO Admin assignments, so location creation will fail for any user until one is granted.
- I will keep the existing security model intact rather than weakening location permissions. If you want regular location admins to create new locations too, I can revise the plan for that permission model instead.
