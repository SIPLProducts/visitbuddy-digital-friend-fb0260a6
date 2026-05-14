## Goal
On the Visitors screen, scope the **Department** and **Gate** filter dropdowns so they only show items belonging to the currently selected plant (location), instead of listing every department and gate across all plants.

## Changes

**File: `src/pages/Visitors.tsx`**

1. Re-run `fetchFilterOptions()` whenever the global selected location changes (add `globalLocationId` / `isAllLocations` to the effect dependency).
2. In `fetchFilterOptions()`:
   - If a specific plant is selected (`!isAllLocations`), filter:
     - `departments` query → `.eq('location_id', globalLocationId)`
     - `gates` query → `.eq('location_id', globalLocationId)`
   - If "All Locations" is active, keep current behavior (load all).
3. When the selected plant changes, reset `departmentFilter` and `gateFilter` back to `'all'` so a stale id from another plant doesn't hide all rows.

No DB, RLS, or other UI changes. Department/gate dropdown rendering stays the same — only the list source narrows.

## Out of scope
- NewVisitor form (separate screen, already filters by location internally).
- Visitor list query itself (location filtering is already applied via `locationFilter`).
