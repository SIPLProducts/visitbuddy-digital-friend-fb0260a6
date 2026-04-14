

# Show New Visitor Form Inline on the Visitors Page

## What changes
Instead of navigating to a separate `/visitors/new` route, clicking "New Visitor" will toggle an inline form panel directly on the Visitors page. The form content stays the same.

## Plan

### 1. Add inline mode state to `Visitors.tsx`
- Add `const [showNewVisitorForm, setShowNewVisitorForm] = useState(false)` 
- Replace the `<Link to="/visitors/new">` button with an `onClick` that sets `showNewVisitorForm(true)`
- When `showNewVisitorForm` is true, render the `NewVisitor` component above the visitors table (or replace the table view)
- Pass an `onClose` callback to navigate back to the list view and refresh data

### 2. Refactor `NewVisitor.tsx` to support inline mode
- Accept optional props: `inline?: boolean` and `onClose?: () => void`
- When `inline` is true, hide the back arrow/navigation header and use `onClose()` instead of `navigate('/visitors')` after successful submission
- When not inline (direct route `/visitors/new`), keep existing behavior unchanged

### 3. Update QuickActions and route
- Change QuickActions path from `/visitors/new` to `/visitors` and add a query param like `?new=true`, or simply keep `/visitors/new` route working for direct access
- Keep the `/visitors/new` route in `App.tsx` as a fallback for direct URL access

## Files affected
- `src/pages/Visitors.tsx` — add state toggle, render NewVisitor inline
- `src/pages/NewVisitor.tsx` — accept `inline`/`onClose` props, conditional navigation
- `src/components/dashboard/QuickActions.tsx` — optionally update path

