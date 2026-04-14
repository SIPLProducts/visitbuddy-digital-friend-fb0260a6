

# Fix Visitor Report and Filters

## Issues Found

### 1. Visitors Page — Date Filter Mutates State (Critical Bug)
**Line 296**: `new Date(fromDate.setHours(0, 0, 0, 0))` calls `.setHours()` directly on the `fromDate` state object, which **mutates it in place**. On every re-render, the date gets corrupted, causing filters to behave unpredictably.

**Fix**: Clone the date before modifying:
```ts
const matchesFromDate = !fromDate || visitorDate >= new Date(new Date(fromDate).setHours(0, 0, 0, 0));
const matchesToDate = !toDate || visitorDate <= new Date(new Date(toDate).setHours(23, 59, 59, 999));
```

### 2. Visitors Page — Location Filter May Not Match
The query `gate:gates(*)` returns gate columns including `location_id`, but `visitor.gate` can be `null` for visitors without a gate. The filter `visitor.gate?.location_id === locationFilter` silently returns `undefined !== 'some-id'` which is correct behavior (filters them out). This is actually working correctly.

### 3. VisitorReport — Filters Applied Only Client-Side After Fetch
The report fetches visitors filtered only by date range from the database, then applies status/location/company/department filters client-side on the `filteredVisitors` array. This is correct, but the **stats cards show unfiltered totals** (they use `stats` which is computed from the full `visitors` array, not `filteredVisitors`). When a user applies a filter, the stats don't update — making it look broken.

**Fix**: Recompute stats based on `filteredVisitors` instead of the raw `visitors` array, or add a memo that recalculates when filters change.

### 4. VisitorReport — Charts Don't Reflect Filters
Same issue: `chartData` is computed from `visitors` (unfiltered), not `filteredVisitors`. When filters are active, charts show all data.

**Fix**: Update `chartData` and `stats` useMemo to use `filteredVisitors` instead of `visitors`.

## Files to Change

- **`src/pages/Visitors.tsx`** — Fix date filter state mutation (line 296-297)
- **`src/pages/VisitorReport.tsx`** — Make stats and charts reactive to active filters by computing from `filteredVisitors`

## Expected Result
- Date filters on Visitors page work reliably without state corruption
- Visitor Report stats cards and charts update when filters are applied
- All dropdown filters (status, location, department, company) visibly affect the displayed data

