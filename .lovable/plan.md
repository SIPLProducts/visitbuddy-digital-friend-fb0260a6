

# Apply global Location filter across the entire app

## Problem
- The Header has a Location selector (and an "All Locations" option for HO Admins) that saves `selectedLocationId` to localStorage and fires a `locationChanged` event.
- Only `Dashboard.tsx` listens to it, and even there it only re-fetches data without actually filtering by the selected location.
- Every other page (Visitors, Vehicles, Employees, Departments, Gates, Appointments, Analytics, Reports, etc.) ignores the global selection. Non-HO users with multiple locations see data from all their assigned locations; HO Admins always see everything regardless of what they pick in the header.
- RLS already prevents leakage to unauthorized locations, but UI scoping per the user's chosen location is missing.

## Solution overview
Introduce a single source of truth for "the currently selected location" and apply it everywhere as a client-side filter on top of existing RLS-restricted queries.

### 1. New hook: `src/hooks/useSelectedLocation.ts`
- Reads `selectedLocationId` from `localStorage` and listens to the `locationChanged` window event.
- Returns:
  - `selectedLocationId` (string | 'all')
  - `isAllLocations` (true when HO Admin picked "All Locations")
  - `locationFilter` helper to apply on a Supabase query (`.eq('location_id', id)` when not 'all')
- For non-HO users with exactly one assigned location, it auto-locks to that single location (no "all" option).

### 2. Header (`src/components/layout/Header.tsx`)
- Keep current UI but ensure the value `'all'` is only available to HO Admins.
- For users with a single assigned location, default and lock to that location (already partly done).
- For users with multiple assigned locations, default to the first one (no "all" option) so they always see one location at a time.

### 3. Page-level integration
For each page that fetches scoped data, read `useSelectedLocation()` and:
- Add the filter to the Supabase query when possible (server-side `.eq('location_id', ...)` or via `gate.location_id` join filter).
- For data already loaded into state, also filter client-side by `selectedLocationId` so existing per-page Location dropdowns stay in sync (or are removed in favor of the global one).
- Re-fetch when `selectedLocationId` changes (subscribe to the existing `locationChanged` event via the hook).

Pages updated:
- `Dashboard.tsx` — actually apply the filter to visitors/vehicles/gates/appointments queries and stat cards.
- `Visitors.tsx` and `VisitorReport.tsx` — filter visitors via `gate.location_id`. Hide the per-page Location dropdown (or sync it to the global value).
- `Vehicles.tsx`, `VehicleReport.tsx`, `VehicleGate.tsx` — filter by `vehicles.location_id`.
- `Appointments.tsx` — filter by department's location.
- `Employees.tsx`, `Departments.tsx`, `Gates.tsx`, `GateQRCodes.tsx` — filter by `location_id`.
- `Analytics.tsx`, `ComplianceReport.tsx` — apply the same filter to all aggregate queries/charts.
- `CheckInOut.tsx`, `BadgePrinting.tsx`, `EmergencyEvacuation.tsx`, `CameraMonitor.tsx`, `Watchlist.tsx`, `AuditLogs.tsx`, `Notifications.tsx` — same treatment.
- `NewVisitor.tsx`, `NewVehicle.tsx`, `Locations.tsx` (forms): pre-fill / restrict gate, department, and host dropdowns to the selected location.

### 4. HO Admin behavior
- The header keeps the "All Locations" option (with the crown icon).
- When "All Locations" is chosen → `selectedLocationId === 'all'` → no location filter is applied (current behavior preserved).
- When a specific location is chosen → every page filters down to just that location's data, exactly like a regular user assigned to that single location.

### 5. Master data scoping note
Pages like Locations master and User Management remain unaffected (they intentionally show all rows the user can administer). Settings/SMTP/templates are global and stay global.

## Files changed
- `src/hooks/useSelectedLocation.ts` (new)
- `src/components/layout/Header.tsx` (remove `'all'` for non-HO, lock single-location users)
- `src/pages/Dashboard.tsx`
- `src/pages/Visitors.tsx`, `src/pages/VisitorReport.tsx`
- `src/pages/Vehicles.tsx`, `src/pages/VehicleReport.tsx`, `src/pages/VehicleGate.tsx`
- `src/pages/Appointments.tsx`
- `src/pages/Employees.tsx`, `src/pages/Departments.tsx`, `src/pages/Gates.tsx`, `src/pages/GateQRCodes.tsx`
- `src/pages/Analytics.tsx`, `src/pages/ComplianceReport.tsx`
- `src/pages/CheckInOut.tsx`, `src/pages/BadgePrinting.tsx`, `src/pages/EmergencyEvacuation.tsx`
- `src/pages/CameraMonitor.tsx`, `src/pages/Watchlist.tsx`, `src/pages/AuditLogs.tsx`, `src/pages/Notifications.tsx`
- `src/pages/NewVisitor.tsx`, `src/pages/NewVehicle.tsx`
- Dashboard subcomponents that fetch their own data (`DepartmentDistribution`, `VisitorTrendChart`, `PeakHoursChart`, `GateStatus`, `RecentVisitors`, `PendingApprovals`, `SecurityOverview`, `CombinedStats`) — accept the global `selectedLocationId` via the hook.

## Expected result
- A non-HO user assigned to one location: sees only that location's data everywhere (already enforced by RLS, now also reflected in counts/lists/charts/dropdowns).
- A non-HO user assigned to multiple locations: header forces choosing one location at a time; every screen shows only that location's data; switching the header location instantly re-scopes everything.
- An HO Admin: keeps "All Locations" view, but selecting a specific location in the header restricts every screen, dashboard stat, chart, list, and dropdown to that single location.

