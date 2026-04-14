

# Fix Location Delete, Add, and Form Scrollbar Issues

## Issues Found

### 1. Deleting a location removes all related data
When a location is deleted, the tables `gates`, `departments`, `employees`, `visitors`, `vehicles`, `vehicle_entries`, and `anpr_events` all have a `location_id` column but **no foreign key constraints**. This means:
- Orphaned records remain in child tables (not cleaned up)
- The user likely expects cascading cleanup

**Fix**: Before deleting the location, explicitly delete related records in dependency order (child tables first). Add a confirmation dialog that clearly warns about cascading data removal.

### 2. "Failed to add location" error
The RLS policy on `locations` allows only HO admins to INSERT. If the logged-in user's `is_ho_admin` flag isn't set, the insert silently fails. The error message is generic ("Failed to add location") with no indication it's a permissions issue.

**Fix**: Log the actual error from Supabase in the toast so the user sees "new row violates row-level security" (or a friendlier version). Also verify the current user has HO admin status before showing the Add button.

### 3. No scrollbar on location form dialog
The form has 10+ fields but the `DialogContent` has no max-height or overflow scroll. On smaller screens the dialog overflows.

**Fix**: Wrap `locationFormContent` in a `ScrollArea` with `max-h-[60vh]` inside both the Add and Edit dialogs.

## Files to Change

### `src/pages/Locations.tsx`
1. **Import** `ScrollArea` from `@/components/ui/scroll-area`
2. **`handleDelete`** — Before deleting the location, delete related records:
   - `accompanying_visitors` (via visitor IDs at that location)
   - `visitor_agreements` (via visitor IDs)
   - `visitors` where gate is at that location
   - `vehicle_entries` where `location_id` matches
   - `anpr_events` where `location_id` matches
   - `vehicles` where `location_id` matches
   - `employees` where `location_id` matches
   - `departments` where `location_id` matches
   - `gates` where `location_id` matches
   - Then delete the location itself
3. **`handleAdd` error handling** — Show the actual error message: `toast.error(\`Failed to add location: \${error.message}\`)`
4. **Form dialogs** — Wrap `locationFormContent` in `<ScrollArea className="max-h-[60vh]">` in both Add and Edit dialogs

## Expected Result
- Deleting a location cleanly removes all associated gates, departments, employees, visitors, and vehicles
- Add location shows a meaningful error if it fails (e.g., permissions)
- The form dialog scrolls properly on small screens

