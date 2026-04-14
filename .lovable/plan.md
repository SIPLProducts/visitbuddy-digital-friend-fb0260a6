

# Hide Visitors List When New Visitor Form is Open

## What changes
In `src/pages/Visitors.tsx`, wrap the filters section and the visitors table (everything after the inline form) in a condition so they only render when `showNewVisitorForm` is `false`.

## Implementation

### File: `src/pages/Visitors.tsx`
- Wrap lines ~407 to end-of-content (filters, bulk actions, table, pagination, dialogs) with `{!showNewVisitorForm && ( ... )}` so the list is hidden while the form is visible
- Dialogs (details, edit, check-in) should remain outside the condition so they still work

This is a single-line wrapper change with no new files or database changes.

