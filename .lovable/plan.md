

# Fix Badge Printing Blank Screen

## Analysis
The PrintBadge page renders correctly in testing, but can show a blank screen in production due to several fragile points:

1. **No error boundary** — If any render-time error occurs (e.g., `format()` on an edge-case date), React crashes to a blank screen with no recovery.
2. **The `badge_printed` update can fail silently** — On the published URL, when a user opens the print page in a new tab, the Supabase auth session may not be available. The UPDATE query fails due to RLS, and while it's in a try/catch, the error could cascade.
3. **Supabase query failure not shown** — If the query returns an error, the page shows "Visitor not found" but if the error is more subtle (empty result due to RLS), it may render with partial data.
4. **Global CSS reset conflicts** — The `* { margin: 0; padding: 0; }` in the style tag conflicts with Tailwind base styles, potentially causing layout issues in some browsers.

## Changes — `src/pages/PrintBadge.tsx`

### 1. Add error state with user-friendly message
Add an `error` state that displays a meaningful message instead of a blank screen when the query or rendering fails.

### 2. Isolate the `badge_printed` update  
Move the `badge_printed` update into its own try/catch so it never interferes with page rendering:
```tsx
// Set visitor data first
setVisitor(data as unknown as VisitorData);

// Mark badge as printed (non-blocking, separate try/catch)
try {
  await supabase.from('visitors').update({ badge_printed: true }).eq('id', visitorId);
} catch (e) {
  console.warn('Could not mark badge as printed:', e);
}
```

### 3. Guard `format()` calls against invalid dates
Wrap date formatting in a safe helper that falls back to a readable string if the date is invalid:
```tsx
const safeFormat = (date: Date, fmt: string) => {
  try {
    if (isNaN(date.getTime())) return 'N/A';
    return format(date, fmt);
  } catch {
    return 'N/A';
  }
};
```

### 4. Add error boundary wrapper
Add a try/catch style error state so if ANY rendering fails, the user sees an error message with a retry button instead of a blank screen.

### 5. Disable auto-print, show Print button prominently
Remove the `setTimeout(() => window.print(), 500)` auto-print behavior that can cause the print dialog to appear before content is fully rendered, making the page look blank behind the dialog. Users can still click the Print button.

## Result
The badge page will be resilient to query failures, auth issues, and edge-case data, showing helpful error messages instead of blank screens.

