
## What I found

- The live session is authenticating Bala as user `d4fb503e-5c8e-4129-a457-56fce358798f`.
- The live backend request for Bala’s roles returns an empty array from `public.user_location_roles`.
- That means `useUserRoles()` is working correctly, but it receives no role data, so the header shows **No Role** and `isHoAdmin` stays `false`.
- Because both `locations` and `email_config` are protected by HO-admin rules, the permission errors are expected until Bala has a real backend role row.
- This is a backend data problem, not a stale-login problem.

## Plan

### 1. Fix Bala’s live backend role assignment
- Add or update one row in `public.user_location_roles` for Bala:
  - `user_id = d4fb503e-5c8e-4129-a457-56fce358798f`
  - `role = 'admin'`
  - `is_ho_admin = true`
  - `location_id = <any valid existing location>`
- If no location exists, create a default location first.
- Keep the current RLS rules unchanged.

### 2. Make the UI less misleading during role loading
- Update `src/components/layout/Header.tsx` so it does not briefly show **No Role** while roles are still loading.
- Update admin-only screens to wait for role loading before deciding button visibility/disabled state:
  - `src/pages/Locations.tsx`
  - `src/pages/Settings.tsx`

### 3. Remove noisy fallback errors for missing role rows
- Update `src/pages/Dashboard.tsx` to use a safe no-role fallback instead of `.single()` on `user_location_roles`, so users without roles do not trigger empty-result errors.

### 4. Verify end-to-end
- Log in as Bala
- Confirm the header shows **HO Admin**
- Confirm Bala’s role query returns one row
- Create a location successfully
- Save email configuration successfully
- Log out and log back in again to confirm the role persists

## Technical details

- The key live evidence is the request to `user_location_roles` for Bala returning `[]`.
- `public.is_ho_admin(auth.uid())` depends entirely on `public.user_location_roles`, so with no row it returns `false`.
- The role fix must be done with privileged backend access, because under the current security model a normal logged-in user cannot grant themselves HO Admin.
- I do not plan to weaken security or rewrite `useUserRoles`, because the current hook is correctly reflecting the live backend state.
