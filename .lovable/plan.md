<final-text>## What I found

- Bala showing **No Role** is coming from the backend role lookup, not from the header itself. `useUserRoles()` only reads `user_location_roles` for the logged-in user.
- The Bala card on the login page is only a demo label in `src/pages/Auth.tsx`; it does not actually grant HO Admin access.
- The likely reason Bala “keeps changing back” is structural: `public.user_location_roles.location_id` is required and has `ON DELETE CASCADE`. So if the location attached to Bala’s HO Admin row gets deleted during cleanup/erase, Bala’s role row is automatically deleted too.
- There is no recovery snapshot in the codebase for old user-role assignments, and `src/pages/UserManagement.tsx` currently does not write audit logs for role add/edit/delete. So exact restoration depends on what still exists in the backend data/history.

## Plan

### 1. Inspect the live role data
- Check Bala’s current user id, current rows in `public.user_location_roles`, and the available rows in `public.locations`.
- Confirm whether Bala’s HO Admin row is missing entirely or was lost because its linked location was deleted.

### 2. Restore Bala as HO Admin permanently
- Create or reuse a stable **Head Office** location in the backend.
- Upsert Bala’s row in `public.user_location_roles` with:
  - `role = 'admin'`
  - `is_ho_admin = true`
  - `location_id = <stable Head Office location>`
- Verify the backend HO-admin check returns `true` for Bala after a fresh login.

### 3. Restore the erased role assignments
- Rebuild all recoverable rows in `public.user_location_roles` from the live backend data that still exists:
  - current users (`profiles`)
  - current locations
  - any surviving role rows
  - existing location/role permission mappings in `public.role_screen_permissions`
  - any prior role details visible from project/chat history
- Reinsert the recovered role rows in the backend.
- If some exact old assignments are unrecoverable, keep Bala as HO Admin immediately so the remaining users can be reassigned from User Management without being blocked again.

### 4. Prevent the same problem from recurring
- Add a safeguard so deleting a location cannot silently remove the role row for an HO Admin without warning/reassignment.
- Add audit logging for role create/update/delete actions in `src/pages/UserManagement.tsx` so future restores are traceable.

### 5. Keep the UI aligned with backend state
- Keep the loading-safe role display in the header.
- Tighten admin screens so they wait for role loading before showing permission-based actions.
- Show a clearer message when a user truly has no assigned backend role.

### 6. Verify end to end
- Log in as Bala.
- Confirm the header shows **HO Admin**.
- Open User Management and confirm restored roles are visible.
- Create a location successfully.
- Open Settings and save/test email configuration.
- Log out and back in again to confirm Bala stays HO Admin.

## Technical details

- Relevant backend tables: `public.user_location_roles`, `public.locations`, `public.profiles`, `public.role_screen_permissions`.
- Important schema detail causing the regression:
```text
user_location_roles.location_id -> locations.id
ON DELETE CASCADE
NOT NULL
```
- Relevant frontend files:
  - `src/hooks/useUserRoles.ts`
  - `src/components/layout/Header.tsx`
  - `src/pages/UserManagement.tsx`
  - `src/pages/Locations.tsx`
  - `src/pages/Settings.tsx`
- Separate issue: if email “Test” still fails after the role restore, that is a different backend function problem and should be fixed after permissions are working again.</final-text>