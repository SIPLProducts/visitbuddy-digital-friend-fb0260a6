

# Fix Visitor Filtering for Manager/Operator Roles

## Problem
The current filtering uses `host_id` to match restricted roles (Manager/Operator) to their visitors. However, there's no tracking of **who created** a visitor. If a Manager creates a visitor for a different host, they can't see it. The user wants: visitors where the user is the host **OR** the user created the visitor.

## Solution
Add a `created_by_user_id` column to the `visitors` table to track the auth user who created each visitor. Then update the filtering logic to show visitors matching either condition.

## Changes

### 1. Database Migration — Add `created_by_user_id` column
```sql
ALTER TABLE public.visitors ADD COLUMN created_by_user_id uuid;
```
No foreign key to `auth.users` (per project conventions). Nullable so existing rows aren't broken.

### 2. `src/pages/NewVisitor.tsx` — Set `created_by_user_id` on insert
When inserting a new visitor, include `created_by_user_id: user.id` (from `useAuth`).

### 3. `src/components/visitors/CheckInDialog.tsx` / `CheckInCaptureDialog.tsx` — Set `created_by_user_id` on any visitor creation paths
Ensure all visitor creation paths set this field.

### 4. Update filtering logic in all 4 files
Change the restricted role filter from:
```ts
v.host_id === hostEmployeeId
```
To:
```ts
v.host_id === hostEmployeeId || v.created_by_user_id === user?.id
```

Files affected:
- `src/pages/Visitors.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/VisitorReport.tsx`
- `src/pages/Analytics.tsx`

### 5. Update Supabase types
The `created_by_user_id` column will be auto-reflected in the generated types after migration.

## Files Changed
- **Migration** — add `created_by_user_id` column to `visitors`
- `src/pages/NewVisitor.tsx` — set `created_by_user_id` on insert
- `src/pages/Visitors.tsx` — update filter to include `created_by_user_id`
- `src/pages/Dashboard.tsx` — same filter update
- `src/pages/VisitorReport.tsx` — same filter update
- `src/pages/Analytics.tsx` — same filter update

