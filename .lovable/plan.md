

# Remove Policy Agreement Popup from Check-In

## Summary
The user doesn't want the Policy Agreement / NDA popup during check-in. The check-in should proceed directly without showing any dialog.

## Changes

### `src/components/visitors/CheckInDialog.tsx`
- Remove the NDA/signature section entirely — no policy agreement, no signature pad, no checkbox
- Keep only the watchlist check (security feature) and a simple confirmation dialog
- The dialog should just show "Confirm check-in for {visitorName}" with Cancel and Confirm buttons
- Watchlist alerts still display if a match is found

This simplifies the check-in to: open dialog → confirm (with watchlist warning if applicable) → done.

