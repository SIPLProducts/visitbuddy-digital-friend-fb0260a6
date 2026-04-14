

# Fix Badge Printing

## Problem Analysis
After investigation, I found these issues that could cause badge printing to fail:

1. **Missing public read policies on `gates` and `locations` tables** — The PrintBadge page is a public route that queries visitors with joins to employees, departments, gates, and locations. While `visitors`, `employees`, and `departments` have public read policies, `gates` and `locations` do NOT. If the new tab doesn't carry the auth session, these joins return empty data or cause errors.

2. **Wrong URL pattern in RecentVisitors** — `RecentVisitors.tsx` line 224 uses `/print-badge/${visitor.id}` (path parameter) instead of `/print-badge?id=${visitor.id}` (query parameter). This means clicking "Print Badge" from the dashboard navigates to a wrong URL, causing "Visitor not found".

3. **Silent update failure** — The `badge_printed` update on line 91-94 of PrintBadge.tsx runs without auth for public access, failing silently. This is minor but should be handled.

## Changes

### 1. Database Migration — Add public read policies for `gates` and `locations`
```sql
CREATE POLICY "Allow public read for badge printing" 
ON public.gates FOR SELECT USING (true);

CREATE POLICY "Allow public read for badge printing" 
ON public.locations FOR SELECT USING (true);
```

### 2. Fix URL in `src/components/dashboard/RecentVisitors.tsx`
- Line 224: Change `/print-badge/${visitor.id}` to use `window.open(\`/print-badge?id=${visitor.id}\`, '_blank')` to match the correct query parameter format and open in a new tab.

### 3. Guard the `badge_printed` update in `src/pages/PrintBadge.tsx`
- Wrap the `badge_printed` update in a try/catch so it doesn't interfere with rendering if auth is unavailable.

