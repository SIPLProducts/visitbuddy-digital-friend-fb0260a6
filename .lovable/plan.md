
User wants both A + B implicitly — fix Syam's account now AND prevent ghost accounts. Going with the full fix.

Plan:

## Fix Syam's account + harden Delete User

### Part 1 — Fix Syam's account now (data migration)
SQL to run:
```sql
-- Move HWMP admin role to the live login account
UPDATE public.user_location_roles
SET user_id = '0c28985f-0fba-48aa-8ee4-c282f7ee8c41'
WHERE user_id = '78411d53-30b1-4509-9bf5-e90dacc216ef';

-- Delete orphan profile
DELETE FROM public.profiles
WHERE user_id = '78411d53-30b1-4509-9bf5-e90dacc216ef';

-- Audit
INSERT INTO public.audit_logs (action, entity_type, entity_id, entity_name, details)
VALUES ('user_role_changed','user','0c28985f-0fba-48aa-8ee4-c282f7ee8c41',
  'Syam babu G',
  jsonb_build_object('reason','Merged duplicate Syam profile; moved HWMP admin role to active login account',
                     'from_user_id','78411d53-30b1-4509-9bf5-e90dacc216ef'));
```

The orphan `auth.users` row for `78411d53...` will be removed via the new edge function (Part 2) right after.

### Part 2 — Harden Delete User permanently
**New edge function**: `supabase/functions/delete-user-fully/index.ts`
- Verifies caller JWT and confirms caller is HO Admin (or Location Admin for users only at their locations).
- Uses `SUPABASE_SERVICE_ROLE_KEY` to:
  1. Delete from `public.user_location_roles` (all rows for that user_id).
  2. Delete from `public.profiles`.
  3. Delete from `auth.users` via `supabaseAdmin.auth.admin.deleteUser(userId)`.
- Returns `{ success: true }` or descriptive error.
- CORS enabled, input validated with zod (`userId: uuid`).

**UI change**: `src/pages/UserManagement.tsx`
- Replace the existing role-only delete handler with a call to `supabase.functions.invoke('delete-user-fully', { body: { userId } })`.
- Update confirmation dialog text to: *"This permanently removes the user, their profile, and all role assignments. This cannot be undone."*
- After success: refetch roles + profiles + emails, toast "User deleted permanently."

### Part 3 — Cleanup the orphan auth row for Syam
After Part 2 deploys, call the new function once with `userId='78411d53-30b1-4509-9bf5-e90dacc216ef'` from the UI (or a one-time invocation) to remove the leftover `auth.users` row. (Will do this from a small admin action; no UI clutter.)

### Result
- Syam logs in → sees **Admin · HWMP** → can access User Management.
- No more ghost profiles when an admin clicks Delete on any user — the auth account, profile, and roles all go together.
- Audit log records the merge.

### Files
- `supabase/functions/delete-user-fully/index.ts` (new)
- `src/pages/UserManagement.tsx` (delete handler + dialog copy)
- One data migration (SQL above)
- One follow-up function invocation to clean Syam's leftover auth row
