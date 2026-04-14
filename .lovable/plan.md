

# Default "Date of Visit" to Current Date in New Visitor Form

## Problem
The `scheduled_date` field is not included in the form's `defaultValues`, so although the Zod schema has a default, the date picker may show "Pick a date" instead of today's date on initial render.

## Change

### `src/pages/NewVisitor.tsx`
- Add `scheduled_date: new Date()` to the `defaultValues` object (around line 94, before the closing brace)

This is a one-line addition. The Zod schema default and insert payload already handle `new Date()` as a fallback, but this ensures the UI displays today's date immediately when the form opens.

