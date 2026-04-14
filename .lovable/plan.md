

# Fix: Populate Screens Table & Make Screen Permissions Work Dynamically

## Problems
1. **`screens` table is empty** — the Screen Permissions tab in User Management shows no screens to configure because there are no records in the `screens` table.
2. **Sidebar is static** — it never checks `role_screen_permissions`, so even if permissions are configured, they have no effect on navigation visibility.
3. **Roles tab shows role+location combos from `user_location_roles`** — this already works, but the "Create Role" wizard step 2 (screen permissions) shows an empty list because `screens` is empty.

## Plan

### 1. Seed the `screens` table via migration
Insert all 26 application screens matching the sidebar menu items (Dashboard, Visitors, Vehicles, Appointments, Check-In/Out, Badge Printing, Visitor Report, Vehicle Report, Compliance, Departments, Employees, Locations, Gates, Gate QR Codes, Vehicle Types, Watchlist, Emergency, Camera Monitor, Analytics, Audit Trail, User Management, Settings, Help, Notifications). Each row will have `name`, `path`, `category`, `icon`, `display_order`, and `is_active`.

### 2. Create a `useScreenPermissions` hook
- Fetches `role_screen_permissions` for the current user's role and selected location
- Joins with `screens` to get paths
- Returns a `canViewScreen(path)` and `canEditScreen(path)` function
- HO Admins and location admins bypass checks (full access)

### 3. Update the Sidebar to filter menu items dynamically
- Import the new hook
- Filter each menu group's items based on `canViewScreen(item.path)`
- Hide empty groups automatically
- While permissions are loading, show a skeleton/spinner

### 4. No changes to Header role display
The role labels fix was already applied in the previous message.

## Files affected
- **Database migration** — seed `screens` table with 26 rows
- **`src/hooks/useScreenPermissions.ts`** — new hook
- **`src/components/layout/Sidebar.tsx`** — filter items using the hook
- **`src/components/layout/MobileBottomNav.tsx`** — also filter using the hook (if applicable)

## Technical detail
The `screens` seed data maps directly to the sidebar's `getMenuGroups()` items. Categories will match sidebar group labels (Overview, Visitor Management, Reports, Organization, Security, Insights, Administration).

