## Goal
On the Appointments New/Edit dialog: filter Hosts and Departments by the currently selected plant (location), and lock the Department field once a Host is selected.

## Changes (`src/pages/Appointments.tsx`)

1. **Filter `fetchData()` by plant** — apply `.eq('location_id', selectedLocationId)` to both `departments` and `employees` queries when `!isAllLocations && selectedLocationId`.

2. **Re-fetch on plant change** — add `selectedLocationId` and `isAllLocations` to the `useEffect` that calls `fetchData()` (and reset `host_id` / `department_id` in `formData` when plant changes so stale selections don't persist).

3. **Lock Department when Host selected** — disable the Department `<Select>` when `formData.host_id` is set. Department auto-fills from host (already implemented); user can clear the host to change department manually.

## Out of scope
- Visitors page (already handled).
- Backend / RLS changes.
