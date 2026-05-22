## Goal
Enforce **strict read-only UX** for the Admin Head role so they cannot trigger any write actions, matching the read-only DB permissions already in place.

## Scope of changes (frontend only)

### 1. `src/pages/Visitors.tsx`
- Pull `isReadOnly` from `useUserRoles()`.
- Hide the **"New Visitor"** button (and disable the inline form trigger) when `isReadOnly` is true.
- Pass `canEdit={!isReadOnly}` to `<VisitorActions />`.
- Hide the bulk-action toolbar buttons (bulk checkout / approve / print actions) when `isReadOnly`.

### 2. `src/components/visitors/VisitorActions.tsx`
- When `canEdit === false` (Admin Head):
  - Do NOT render the quick **Approve** / **Reject** buttons.
  - Do NOT pass `onApprove` / `onReject` items in the dropdown.
  - Do NOT render **Check In**, **Check Out**, **Check-in & Print** quick buttons.
  - Keep only **View Details** and **Print Badge** (read-only friendly).

### 3. `src/components/dashboard/PendingApprovals.tsx`
- Hide the entire card for Admin Head (similar to the existing `isGateSecurityOnly` guard) — add an `isReadOnly` check so no Approve / Reject buttons are visible on the dashboard either.

### 4. Other write-action surfaces to guard with `isReadOnly`
- `src/pages/Vehicles.tsx` — hide "New Vehicle" / edit / delete buttons.
- `src/pages/Appointments.tsx` — hide "New Appointment" + edit/cancel actions.
- `src/pages/Employees.tsx`, `Departments.tsx`, `Gates.tsx`, `Locations.tsx`, `VehicleTypes.tsx`, `Watchlist.tsx`, `UserManagement.tsx`, `Settings.tsx` — hide Add / Edit / Delete / Import buttons.
- `src/pages/CheckInOut.tsx` — hide check-in/out submit buttons.
- `src/components/visitors/VisitorDetailsDialog.tsx` & `VisitorEditDialog.tsx` — disable Save and action buttons.

For these I'll use a single pattern: `const { isReadOnly } = useUserRoles();` then wrap action buttons with `{!isReadOnly && (...)}` or set `disabled={isReadOnly}`.

### 5. Sidebar / route-level safety
- No new routes needed; `useScreenPermissions.canEditScreen` already returns `false` for Admin Head, but UI buttons don't currently consult it — the explicit `isReadOnly` checks above are the source of truth.

## Out of scope
- No DB / RLS changes (already enforced).
- No changes to viewing, filtering, exporting, or report download flows — Admin Head retains full plant-wise read & export access.

## Result
Admin Head sees the same data as HO Admin but every create / edit / approve / reject / delete / check-in / check-out control is hidden or disabled across the app.