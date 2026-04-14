

# Fix HO Admin Role for Bala + Fix Logout Button

## Issues

### 1. Missing HO Admin role
The `user_location_roles` table is **empty** — confirmed by database query. Bala's user (`d4fb503e-5c8e-4129-a457-56fce358798f`) has no role record, so all RLS-protected actions fail and the header shows "User / No Role".

### 2. Logout button not working
The `signOut` function in `useAuth.tsx` calls `supabase.auth.signOut()` without error handling. If it throws (e.g. network issue or scope conflict in iframe), the error is swallowed and the user stays logged in. It also doesn't clear local state explicitly on failure.

## Plan

### Step 1: Insert HO Admin role for Bala
Use the database insert tool to add:
```sql
INSERT INTO public.user_location_roles (user_id, location_id, role, is_ho_admin)
VALUES (
  'd4fb503e-5c8e-4129-a457-56fce358798f',
  '94c4821a-70e6-4249-8d25-e4252a39c96f',
  'admin',
  true
);
```

### Step 2: Fix logout in `src/hooks/useAuth.tsx`
Update `signOut` to:
- Use `scope: 'local'` to avoid cross-origin issues in iframe/preview
- Add try/catch with fallback — even if the API call fails, clear client state and redirect
- Explicitly set user/session to null

```typescript
const signOut = async () => {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch (error) {
    console.error('Sign out error:', error);
  }
  // Always clear state regardless of API result
  setUser(null);
  setSession(null);
};
```

## Files to modify
- **Database**: `user_location_roles` — insert 1 row
- **`src/hooks/useAuth.tsx`** — update `signOut` function (lines 64-66)

