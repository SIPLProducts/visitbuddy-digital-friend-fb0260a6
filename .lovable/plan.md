

# Fix Filters Not Updating Data in Dashboard & Visitor Report

## Root Cause
Multiple components and computed values read from the raw `visitors` array instead of `filteredVisitors`, making it appear that filters have no effect.

## Bugs Found

### Dashboard (`src/pages/Dashboard.tsx`)
1. **Smart filter badge counts (lines 282-287)** — all 5 chip counts use `visitors.filter(...)` instead of the full dataset. When location/department filters are active, these counts should reflect the filtered subset.
2. **`filteredStats.avgVisitDuration` and `filteredStats.overstayed` (lines 276-278)** — these pass through from the raw `stats` object computed in `fetchDashboardData`. They never recalculate when filters change.
3. **`filteredStats.scheduledAppointments` (line 275)** — comes from a separate count query, not filtered by location/department at all.
4. **`SecurityOverview` (line 495-499)** — receives raw `visitors`, ignoring all filters.
5. **`PeakHoursChart` (line 509)** — receives raw `visitors`, ignoring all filters.
6. **`VisitorTrendChart` (line 505)** — fetches its own data independently, never respects filters.

### Visitor Report (`src/pages/VisitorReport.tsx`)
1. **Quick filter chip counts (lines 869-870)** — "Scheduled" and "Pending" counts use `visitors.filter(...)` instead of `filteredVisitors`.
2. **"With Laptop" chip (line 878-881)** — click handler returns early, does nothing.

## Plan

### 1. Fix Dashboard `filteredStats` to compute from filtered data
Recompute `avgVisitDuration` and `overstayed` from `filteredVisitors` directly in the `filteredStats` useMemo, instead of passing through from `stats`.

### 2. Fix Dashboard smart filter badge counts
Change lines 282-287 to use a base set that respects location + department filters (but not the smart filter itself, since the chip shows the count for that category).

### 3. Fix Dashboard chart components
Pass `filteredVisitors` instead of `visitors` to `SecurityOverview` and `PeakHoursChart`. For `VisitorTrendChart`, pass location/department filter values as props so it can filter its own queries.

### 4. Fix Visitor Report chip counts
Change "Scheduled" and "Pending" chip counts to use `filteredVisitors` instead of `visitors`.

### 5. Fix "With Laptop" quick filter
Make the chip toggle a separate `laptopFilter` boolean state, or integrate it into the existing filter logic so clicking it actually filters the table.

## Files to edit
- `src/pages/Dashboard.tsx` — fix filteredStats, chip counts, component props
- `src/pages/VisitorReport.tsx` — fix chip counts, laptop filter
- `src/components/dashboard/VisitorTrendChart.tsx` — accept optional filter props
- `src/components/dashboard/SecurityOverview.tsx` — already accepts visitors prop, just needs correct data passed
- `src/components/dashboard/PeakHoursChart.tsx` — already accepts visitors prop, just needs correct data passed

