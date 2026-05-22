## Goal
Create a new auth user **Pradeep** with the global read-only **Admin Head** role.

- Email: `pradeep.p@sharviinfotech.com` (note: original message had `@sharviinfotech` without TLD — assuming `.com` to match the existing `bala@sharviinfotech.com` pattern; confirm if different)
- Password: `123456`
- Full name: `Pradeep`
- Role flag: `is_admin_head = true` (global, all plants, read-only)

## Steps

1. **Create the auth user** via a one-off Edge Function call (using Supabase Admin API with `email_confirm: true`, mirroring `bulk-create-employee-users`). This returns the new `user_id`.
2. **Insert profile row** into `public.profiles` (`user_id`, `full_name = 'Pradeep'`).
3. **Insert role row** into `public.user_location_roles`:
   - `user_id = <new id>`
   - `location_id = <any existing location>` (required NOT NULL; Admin Head is global so the specific location is irrelevant — will use the first active location)
   - `role = 'operator'` (placeholder; ignored because `is_admin_head` overrides)
   - `is_admin_head = true`
   - `is_ho_admin = false`

## Technical notes

- `auth.users` cannot be inserted via SQL `INSERT` from the migration/insert tools — needs the Admin API. I'll create a tiny temporary Edge Function `create-admin-head-user` that does steps 1–3 atomically, invoke it once, then leave it in place (or delete) per your preference.
- After login, Pradeep will see all locations in the header switcher, can view every screen and download reports, but every Add/Edit/Approve/Delete button is hidden and DB RLS blocks writes regardless.

## Confirm before I proceed

- Is the email `pradeep.p@sharviinfotech.com`? (you wrote it without `.com`)
- OK to create and keep a small `create-admin-head-user` edge function for this (and reuse it for future Admin Head users)?
