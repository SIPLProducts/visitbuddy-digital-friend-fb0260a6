

# Fix Email Config RLS Error — Grant HO Admin Role

## Problem
Your user (`bala@sharviinfotech.com`, ID `d4fb503e-5c8e-4129-a457-56fce358798f`) has no entry in the `user_location_roles` table. The `email_config` RLS policy requires `is_ho_admin(auth.uid())` to be true, which fails because no role record exists.

The previous migration to add this role did not persist.

## Fix

### Database Migration
Insert the HO admin role for your user:

```sql
INSERT INTO public.user_location_roles (user_id, location_id, role, is_ho_admin)
VALUES (
  'd4fb503e-5c8e-4129-a457-56fce358798f',
  '957c294b-b632-4d4f-a7c7-53f7d04e97c9',
  'admin',
  true
);
```

### No code changes needed
The Settings page and edge function are correct. This is purely a missing database record.

## After Fix
Log out and log back in, then retry saving the email configuration.

