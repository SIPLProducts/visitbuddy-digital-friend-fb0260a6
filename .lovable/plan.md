

# Filter Visitors by Host for Manager & Operator Roles

## Problem
Currently all roles see all visitors. The user wants Manager and Operator roles to only see **their own visitors** (where they are the host) across all parts of the application. Admin, HO Admin, and Gate Security should continue seeing all visitors.

## Approach
Match the logged-in user to their employee record via email, then filter visitors where `host_id` equals that employee's ID. This filtering will be applied client-side after fetching (since RLS already scopes by location).

## Changes

### 1. Create a shared hook: `src/hooks/useHostEmployee.ts`
- Fetches the employee record matching `user.email`
- Returns `hostEmployeeId` (the employee UUID) for use in filtering
- Used by multiple components to avoid duplicating lookup logic

### 2. `src/pages/Visitors.tsx` — Filter visitors for Manager/Operator
- Import `useHostEmployee` hook
- Add a computed `isRestrictedRole` = not HO Admin, not Admin, not Gate Security (i.e., Manager or Operator)
- After fetching visitors, filter client-side: if `isRestrictedRole`, only show visitors where `host_id === hostEmployeeId`
- This affects the main visitor table, counts, and all actions

### 3. `src/pages/Dashboard.tsx` — Filter dashboard data for Manager/Operator
- Import `useHostEmployee` and `useUserRoles`
- Filter the `visitors` array by `host_id` before computing stats (today's visitors, active check-ins, pending approvals, etc.)
- Pass filtered visitors to `RecentVisitors` and `PendingApprovals` components

### 4. `src/components/dashboard/PendingApprovals.tsx` — Already receives filtered data
- No changes needed since it receives visitors as props from Dashboard

### 5. `src/components/dashboard/RecentVisitors.tsx` — Already receives filtered data
- No changes needed since it receives visitors as props from Dashboard

### 6. `src/pages/VisitorReport.tsx` & `src/pages/Analytics.tsx` — Same filtering
- Apply the same host-based filter for Manager/Operator roles in report and analytics pages

## Role Logic Summary
```text
HO Admin     → sees ALL visitors
Admin        → sees ALL visitors (at their locations)
Gate Security→ sees ALL visitors (for check-in/out)
Manager      → sees only visitors where host_id = their employee ID
Operator     → sees only visitors where host_id = their employee ID
```

## Files Changed
- `src/hooks/useHostEmployee.ts` (new) — shared hook to resolve user → employee ID
- `src/pages/Visitors.tsx` — add host filtering for restricted roles
- `src/pages/Dashboard.tsx` — add host filtering for stats and child components
- `src/pages/VisitorReport.tsx` — add host filtering
- `src/pages/Analytics.tsx` — add host filtering

