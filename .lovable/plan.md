## Problem
Inactive (deactivated) locations currently appear in the top bar location dropdown filter, allowing users to select a location that is no longer operational.

## Solution
Filter the `fetchLocations` query in `Header.tsx` so only `status = 'active'` locations are returned, for all user types (global viewers and location-scoped users alike).

## Changes
1. In `src/components/layout/Header.tsx`, within the `fetchLocations` function:
   - Add `.eq('status', 'active')` to the global-viewer query (line ~85).
   - Add `.eq('status', 'active')` to the location-scoped query (line ~97).

## Acceptance Criteria
- Inactive locations do not appear in the top bar dropdown for any user role.
- Active locations continue to appear as before.
- HO Admins/Admin Heads can still manage inactive locations via the Locations management page.

## No backend changes needed
The `locations` table already has a `status` column. Only frontend query filters are added.