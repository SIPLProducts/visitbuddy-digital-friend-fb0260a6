## Goal
For future-dated visits that the host approves, make sure they appear in the **Check-In / Check-Out** screen immediately after approval, and surface the **Date of Visit** clearly so security knows which day each scheduled visitor belongs to.

## Findings
- `CheckInOut.tsx` already loads all visitors with `status IN ('checked_in', 'scheduled')` with no date filter. So an approved future visit *does* technically appear right away.
- But the visitor card and details panel only show name / company / visitor_id. There is no indication of `scheduled_date`, so a security guard cannot tell whether a "Scheduled" entry is for today or for next week.

## Changes (frontend only, `src/pages/CheckInOut.tsx`)

1. **Visitor list row** — add a small "Visit: DD/MM/YYYY" line under the company/ID. If `scheduled_date == today (IST)`, color it normally; if it's a future date, render the badge text as "Scheduled · DD MMM" so it's distinguishable from today's queue.
2. **Right-side details panel** — add a "Date of Visit" row alongside Host / Department / Purpose, formatted `DD/MM/YYYY` (fallback `—`).
3. **Sort order** — sort `filteredVisitors` so today's visits come first, then upcoming dates ascending, then the rest by `created_at desc`.
4. **Scheduled stats card** — keep counting all scheduled visitors (unchanged), but add a sub-line "X today · Y upcoming" based on `scheduled_date` vs today's IST date.

## Out of scope
- No DB / status / RLS changes. Approved future visits are already `status='scheduled'` and already reachable.
- No change to check-in business logic — security can still check in a future-dated visitor if the visitor arrives early (matches current behavior).
- Visitors page, Dashboard, and reports stay as-is.

## Verification
1. Create a visitor with `scheduled_date` = tomorrow, host-approves it.
2. Open Check-In / Check-Out → visitor appears immediately with "Visit: tomorrow's date" line.
3. Selecting the visitor shows "Date of Visit" in the details panel.
4. Scheduled stat shows "1 today · 1 upcoming" when both exist.
