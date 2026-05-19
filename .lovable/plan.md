## Goal
Surface accompanying visitor information on the Dashboard so security staff can see at a glance when a primary visitor brought guests along.

## Changes

### 1. Recent Visitors card (`src/components/dashboard/RecentVisitors.tsx`)
- When a visitor has `accompanying_count > 0`, show a small pill next to the status badge: `+N guest(s)`.
- Fetch the accompanying rows (name, has_laptop, has_mobile) for visitors visible in the list and render their names as a compact secondary line:
  `With: Ramesh K., Priya S. (+1 more)` — truncate after 2 names.
- Expand an inline collapsible (chevron) to show the full list with device flags (laptop/mobile) for each accompanying entry.

### 2. Dashboard stats (`src/pages/Dashboard.tsx`)
- Add a new KPI tile (or extend existing visitor card) showing **Total People Inside** = checked-in visitors + sum of their `accompanying_count`. This gives an accurate facility headcount.
- Add today's "Accompanying Guests" count to `filteredStats` (sum of accompanying_count for visitors filtered to today).

### 3. Data fetch
- In `fetchDashboardData`, after loading visitors, fetch `accompanying_visitors` rows where `visitor_id` is in the loaded set (single query) and attach them to each visitor as `accompanying: []`.
- Pass enriched visitors to `RecentVisitors`.

### Technical notes
- `visitors.accompanying_count` already exists; `accompanying_visitors` table already has public SELECT RLS — no DB changes needed.
- Keep styling consistent with the existing glassmorphism tokens; use `Badge variant="secondary"` and existing `Users` icon from lucide-react.
- Real-time subscription on `visitors` table already refreshes; add an additional channel for `accompanying_visitors` so the badge updates live when guests are added.

## Out of scope
- No changes to the visitor registration flow, RLS, or schema.
- No changes to other pages (Visitors list, Reports) in this task.
