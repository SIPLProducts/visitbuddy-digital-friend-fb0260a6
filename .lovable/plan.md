

# Fix Email Config RLS Error

## Root Cause
The RLS policy on `email_config` requires `is_ho_admin(auth.uid())` to be true. Your logged-in user (`bala@sharviinfotech.com`) has **no entry** in the `user_location_roles` table, so `is_ho_admin` returns false and the insert is blocked.

## Fix

### 1. Database Migration
Add your user to `user_location_roles` with `is_ho_admin = true` so you can manage email config (and all other admin features):

```sql
INSERT INTO public.user_location_roles (user_id, location_id, role, is_ho_admin)
SELECT 'd4fb503e-5c8e-4129-a457-56fce358798f', 
       (SELECT id FROM public.locations LIMIT 1), 
       'admin', 
       true
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_location_roles 
  WHERE user_id = 'd4fb503e-5c8e-4129-a457-56fce358798f'
);
```

If no locations exist yet, we'll create a default one first.

### 2. No code changes needed
The Settings page and edge function code are correct. The issue is purely a missing database role assignment.

## Expected Result
After adding the HO admin role, saving email configuration will work without RLS errors.

