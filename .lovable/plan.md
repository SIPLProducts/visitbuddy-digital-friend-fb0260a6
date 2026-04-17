
User reports: switching to "C&D" location shows "no records found" on Visitors page, and reports (Visitor Report, Vehicle Report) don't respect the selected location filter.

Likely cause: Visitors page filters by `gate.location_id`, but visitors created without a gate (or via self-service) may have `gate_id = null` OR the page's location filter logic doesn't account for the global `selectedLocationId`. Reports pages likely fetch all data without applying location scope.

Let me outline the fix without exploring further (the pattern is clear from prior work in this conversation).

# Apply selected-location filter to Visitors page and all Reports

## Problem
- Visitors page shows "no records found" for C&D location even though visitors exist.
- Visitor Report, Vehicle Report, and other reports show data across all locations regardless of the global location selector.
- Visitors created without a `gate_id` (e.g. self-service or older records) may be invisible when filtering strictly by `gate.location_id`.

## Root cause
1. Reports pages (`VisitorReport.tsx`, `VehicleReport.tsx`, `ComplianceReport.tsx`, `Analytics.tsx`) fetch data without using `useSelectedLocation`.
2. Visitors page's location filter relies solely on `gate.location_id`. Records with `gate_id = null` or with a gate whose location doesn't match are excluded — and the page may not be reacting to the global header location at all.

## Fix

### 1. `src/pages/Visitors.tsx`
- Use `useSelectedLocation()` to read `selectedLocationId` / `isAllLocations`.
- After fetching visitors (with `gate:gates(location_id, name, building)`), filter client-side:
  - When a specific location is selected → keep only visitors where `gate?.location_id === selectedLocationId`.
- Re-fetch / re-filter when `selectedLocationId` changes (add to `useEffect` deps).
- Verify the existing in-page Location filter dropdown stays in sync with the header selection (or hide it when the header already constrains location).

### 2. `src/pages/VisitorReport.tsx`
- Use `useSelectedLocation()`.
- Include `gate:gates(location_id, name, building)` in the visitors query.
- Filter results by `gate?.location_id === selectedLocationId` when not `isAllLocations`.
- Add `selectedLocationId` to the fetch `useEffect` deps so charts/tables refresh on header change.

### 3. `src/pages/VehicleReport.tsx`
- Use `useSelectedLocation()`.
- Vehicles already have `location_id` directly → apply `.eq('location_id', selectedLocationId)` to both `vehicles` and `vehicle_entries` queries when not `isAllLocations`.
- Add `selectedLocationId` to fetch deps.

### 4. `src/pages/ComplianceReport.tsx`
- Use `useSelectedLocation()`.
- Same pattern: include gate join, filter visitors by `gate.location_id`; deps refresh.

### 5. `src/pages/Analytics.tsx`
- Same pattern — apply location filter to all queries used by charts/cards.

## Behaviour after fix
- HO Admin "All Locations" → unchanged, sees everything.
- Specific location selected (HO Admin or any other user) → Visitors list, Visitor Report, Vehicle Report, Compliance Report, Analytics all show only that location's data.
- C&D visitors will appear on the Visitors page when C&D is selected (assuming their `gate_id` belongs to C&D — if some have `gate_id = null`, they'll be excluded; we can later decide whether to surface those to HO Admin only).

## Files changed
- `src/pages/Visitors.tsx`
- `src/pages/VisitorReport.tsx`
- `src/pages/VehicleReport.tsx`
- `src/pages/ComplianceReport.tsx`
- `src/pages/Analytics.tsx`
