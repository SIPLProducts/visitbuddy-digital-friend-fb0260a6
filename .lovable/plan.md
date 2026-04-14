

# Add Separate "Date of Visit" Column to Visitor List

## Summary
Currently the "Date of Visit" column in the Visitors table actually displays the `created_at` date (creation date). The fix is to rename that column to "Created Date" and add a new "Date of Visit" column that shows the actual `scheduled_date`.

## Changes

### `src/pages/Visitors.tsx`
- Rename the existing column header from `dateOfVisit` to "Created Date" (line 453)
- Add a new "Date of Visit" column header after "Created Date" that displays `scheduled_date`
- Update the table body: change the existing cell (line 529-531) to show `created_at` with label "Created Date"
- Add a new table cell after it showing `scheduled_date` formatted as `dd/MM/yyyy`, or "—" if not set

### `src/i18n/locales/en.json` (and other locale files)
- Add a new translation key for "Created Date" if needed, or use inline text

## Result
The table will have two date columns:
1. **Created Date** — when the visitor record was created (`created_at`)
2. **Date of Visit** — the actual scheduled visit date (`scheduled_date`)

