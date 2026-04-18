

## Add a working Location filter to User Management

### What's actually there today
The User Management page (`/users`) has **only a free-text search box** on both the "Assign Users" and "Users by Location" tabs — there is no Location dropdown filter at all. The global header location selector ("C&D HYD" in your screenshot) is also ignored on this page. So when you pick a location and expect the user list to narrow down, nothing happens. That's the "filter not working" symptom.

### Fix — add a real Location filter dropdown

Add a **Location** `<Select>` next to the search box on both:
1. **Assign Users** tab (table view)
2. **Users by Location** tab (grouped card view)

Behavior:
- Options: "All Locations" + every location the current user can access (HO Admin sees all; Location Admin sees only their assigned locations).
- Default value seeded from the global header location (`useSelectedLocation`) so picking "C&D HYD" in the header pre-filters the page.
- For Location Admins with a single location, the filter auto-locks to that location (consistent with the rest of the app).
- Combines with the existing search box (AND logic).

### Files to change
1. `src/pages/UserManagement.tsx`
   - Add new state: `filterLocationId` (default `'all'`, seeded from `useSelectedLocation`).
   - Render a `<Select>` next to each tab's search input populated from `accessibleLocations`.
   - Update the `filteredUserRoles` derivation and the "Users by Location" `grouped` computation to also filter by `filterLocationId` when not `'all'`.
   - Keep the existing role-scoping (`adminLocationIds`) untouched so RLS-aligned visibility stays correct.

### Result
- Picking a location in the new dropdown immediately narrows the user table and the grouped cards to that location.
- Header location selection seeds the filter on first open.
- "All Locations" restores the full list (HO Admin only).

No DB / RLS / Edge Function changes needed.

