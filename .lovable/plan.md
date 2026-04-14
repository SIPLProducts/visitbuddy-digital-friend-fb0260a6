

# Add "Users by Location" Sub-Tab in User Management

## What we're building
A new tab in User Management that shows all users grouped by location, with expandable location cards displaying each user's name, role, and HO Admin status. This gives a quick location-wise view of who has access where.

## Implementation

### File: `src/pages/UserManagement.tsx`

1. Add a 4th tab called **"Users by Location"** (with MapPin icon) to the existing TabsList, placed after "Assign Users"

2. The tab content will:
   - Group `scopedUserRoles` by `location_id`
   - Render one Card per location with the location name as the header and user count
   - Inside each card, show a table with columns: User Name, Role (badge), HO Admin
   - Include a search filter that works across all locations
   - Show a summary count (e.g., "3 users at this location")

3. No new files or database changes needed — all data is already fetched in `fetchData()`

## Technical details
- Reuse existing `scopedUserRoles`, `locations`, `roleColors`, `roleLabels` data
- Group by `location_id` using a reduce, then render each group as a Card with a Table inside
- The search filter already exists (`searchQuery`) and will be reused

