

# Add Missing Visitor Details Across All Views and Exports

## Summary
Add Created Date, Date of Visit, and Purpose of Visit columns/fields wherever visitor details are displayed — including the Visitor Report table, Visitors table, Visitor Details dialog, Compliance Report, and all CSV export functions.

## Changes

### 1. `src/pages/VisitorReport.tsx` — Report Table & CSV Export

**Table**: Add 3 new columns — "Created Date", "Date of Visit", "Purpose" — between "Host" and "Location" columns. Update `colSpan` from 9 to 12.

**CSV Export** (line 292): Add "Created Date", "Date of Visit" headers and corresponding data fields (`created_at` formatted, `scheduled_date` formatted).

### 2. `src/pages/Visitors.tsx` — Visitors Table

**Table**: Add a "Purpose" column after "Host/Department" column (before "Created Date"). Update `colSpan` from 13 to 14.

### 3. `src/components/visitors/VisitorDetailsDialog.tsx` — Details Dialog

Already shows Date of Visit. Add "Purpose" field if not already visible — currently it IS shown conditionally. Also add "Created Date" field showing `visitor.created_at`.

### 4. `src/pages/ComplianceReport.tsx` — Compliance CSV

Add "Purpose" and "Date of Visit" to the violations/visitor export data.

## Files Changed
- `src/pages/VisitorReport.tsx` — Add Created Date, Date of Visit, Purpose columns to table + CSV export
- `src/pages/Visitors.tsx` — Add Purpose column to table
- `src/components/visitors/VisitorDetailsDialog.tsx` — Add Created Date field
- `src/pages/ComplianceReport.tsx` — Add Purpose to CSV export

