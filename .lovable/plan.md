

# Fix: Newly Created Users Not Showing in Role Assignment

## Root Cause
The `profiles` table has an RLS policy that restricts SELECT to `auth.uid() = user_id` — each user can only see their **own** profile. When the HO Admin opens the "Assign User" dialog, the dropdown is populated from `profiles`, but the query only returns the admin's own profile. Newly created users are invisible.

## Fix

### 1. Update RLS policy on `profiles` table
Add a new SELECT policy allowing HO Admins to view all profiles:

```sql
CREATE POLICY "HO Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (is_ho_admin(auth.uid()));
```

This works alongside the existing "Users can view their own profile" policy (both are permissive, so either match grants access).

### 2. No frontend changes needed
The assign user dropdown already iterates over `profiles` — once the RLS policy lets the admin see all profiles, the dropdown will populate correctly.

## Files affected
- Database migration only (one new RLS policy)

