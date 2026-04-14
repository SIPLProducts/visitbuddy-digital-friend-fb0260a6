

# Fix "No Role" Display in Header

## Problem
The header shows "No Role" because:
1. When `selectedLocationId` is `"all"` (HO admin), no role matches — but this is already handled by the `isHoAdmin` check, so it's fine for HO admins.
2. For **regular users**, there's a race condition: `selectedLocationId` starts as `''`, and the location default is set only after locations load. During this time, `currentRole` is `undefined`, showing "No Role". Even after loading, if `selectedLocationId` doesn't match any role's `location_id` (e.g. saved location in localStorage was changed), it stays "No Role".

## Fix — `src/components/layout/Header.tsx`

**Line 87**: Change `currentRole` logic to be more resilient:
- If `selectedLocationId` matches a role, use that role.
- Otherwise, fall back to the **first role** the user has (since they always have at least one role if they can log in).

```tsx
const currentRole = userRoles.find(r => r.location_id === selectedLocationId)?.role 
  || userRoles[0]?.role;
```

This way, even during the initial load or if "all" is somehow selected for a non-HO user, the header shows their actual role instead of "No Role".

Also update **line 193** to show the user's actual name from their profile instead of generic "User" text — but that's a separate concern. The core fix is the role fallback.

