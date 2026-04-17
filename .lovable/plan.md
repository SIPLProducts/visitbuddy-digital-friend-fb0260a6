
The user wants dashboard counts/stats to also respect the selected location filter. Let me check what dashboard subcomponents still fetch unfiltered data.

From earlier work: `CombinedStats.tsx` was already updated. Still need to check the other dashboard widgets that fetch their own data.

# Apply location filter to all Dashboard count widgets

## Problem
Dashboard stat cards and widgets fetch their own data without respecting the global location selection. Counts (visitors today, vehicles inside, gates, pending approvals, etc.) show totals across all locations even when a specific location is selected in the header.

## Changes

### Subcomponents to update (each will use `useSelectedLocation` and filter queries)
- `src/components/dashboard/OccupancyMeter.tsx` — filter checked-in visitor count by `gate.location_id`
- `src/components/dashboard/GateStatus.tsx` — filter gates by `location_id`
- `src/components/dashboard/PendingApprovals.tsx` — filter pending visitors by `gate.location_id`
- `src/components/dashboard/RecentVisitors.tsx` — filter recent visitors by `gate.location_id`
- `src/components/dashboard/SecurityOverview.tsx` — filter security events by location
- `src/components/dashboard/DepartmentDistribution.tsx` — filter visitors by `gate.location_id`
- `src/components/dashboard/VisitorTrendChart.tsx` — filter trend data by `gate.location_id`
- `src/components/dashboard/WeeklyOverview.tsx` — filter weekly counts by `gate.location_id`

### Pattern applied to each
```typescript
const { selectedLocationId, isAllLocations } = useSelectedLocation();

useEffect(() => {
  fetchData();
}, [selectedLocationId, isAllLocations]);

// In fetch: filter by location_id directly OR by gate.location_id (client-side
// filter after join) for visitor-related queries.
```

### Also verify
- `src/pages/Dashboard.tsx` main stat cards (today's visitors, inside count, etc.) already pass through filter — re-confirm.

## Expected result
Every count, chart, list, and meter on the Dashboard reflects only the selected location's data. HO Admin "All Locations" still shows aggregated totals.
