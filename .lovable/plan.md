

# Add "Date of Visit" Field to Visitor Form

## Summary
Add a date picker for scheduling the visit date when pre-registering a visitor. Currently, visitors are created with no visit date — only `check_in_time` is set at actual check-in.

## Changes

### 1. Database migration — add `scheduled_date` column to `visitors` table
- Add `scheduled_date DATE NULL DEFAULT CURRENT_DATE` to the `visitors` table
- This stores the expected date of visit

### 2. Update `src/pages/NewVisitor.tsx`
- Add `scheduled_date` to the Zod schema (as an optional date, defaulting to today)
- Add a date picker field (using the Shadcn Calendar + Popover pattern) in the Personal Information card, after the company/purpose fields
- Include `scheduled_date` in the insert payload sent to the database
- Import `CalendarIcon`, `Calendar`, `Popover`, `format` from date-fns

### 3. Update `src/components/visitors/VisitorEditDialog.tsx`
- Add `scheduled_date` to the form state
- Add a date picker field in the edit form
- Include `scheduled_date` in the update payload

### 4. Update `src/types/database.ts`
- Add `scheduled_date: string | null` to the `Visitor` interface

## Files modified
- **Migration** — new column `scheduled_date` on `visitors`
- `src/types/database.ts` — add field to Visitor type
- `src/pages/NewVisitor.tsx` — add date picker
- `src/components/visitors/VisitorEditDialog.tsx` — add date picker

