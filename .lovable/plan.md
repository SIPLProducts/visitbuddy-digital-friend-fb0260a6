Add Active Locations and Inactive Locations stat cards to the Dashboard.

1. Compute counts from existing `locations` state:
   - `activeLocationsCount` = locations.filter(l => l.status === 'active').length
   - `inactiveLocationsCount` = locations.filter(l => l.status === 'inactive').length

2. Add two new `StatCard` components to the stats grid:
   - "Active Locations" with `Building2` icon, `emerald` color
   - "Inactive Locations" with `Building2` icon, `amber` color

3. Adjust the stats grid layout. Currently `xl:grid-cols-8` with 8 cards. Adding 2 cards makes 10 total. Change the grid to `xl:grid-cols-5` so 10 cards fit evenly across 2 rows on extra-large screens. Keep smaller breakpoints as-is (`grid-cols-2 md:grid-cols-3 lg:grid-cols-4`).

No backend changes needed — the Dashboard already fetches all locations.