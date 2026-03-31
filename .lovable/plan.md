

# Fix: Watchlist Alert During Visitor Check-In

## Issues Found

1. **Race condition**: `checkWatchlist()` is called before `enableWatchlist` state is updated from the async tenant settings fetch, so it may exit early because the default `true` value hasn't been confirmed yet — but more critically, the watchlist query only selects `name, severity, reason` but then tries to match on `phone` and `email` fields that aren't fetched.

2. **Missing columns in query**: The watchlist check query (`select('name, severity, reason')`) doesn't include `phone` or `email`, so phone/email matching always fails.

## Plan

### 1. Fix CheckInDialog watchlist query (src/components/visitors/CheckInDialog.tsx)
- Update the watchlist select to include `phone` and `email` columns: `select('name, severity, reason, phone, email')`
- Move `checkWatchlist()` call to run after tenant settings are loaded, or run it independently (since `enableWatchlist` defaults to `true`, this is minor but worth fixing for correctness)

### 2. Verify the CheckInDialog receives visitor props
- Already confirmed: `visitorPhone` and `visitorEmail` are passed from the Visitors page via `checkInVisitor?.phone` and `checkInVisitor?.email`

This is a small but critical bug fix — the watchlist feature exists but silently fails on phone/email matching due to missing columns in the query.

