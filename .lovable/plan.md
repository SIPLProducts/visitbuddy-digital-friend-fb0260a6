

# Add Date of Visit to Visitor Details Dialog

## Summary
Add the `scheduled_date` field as "Date of Visit" in the Visit Information section of the `VisitorDetailsDialog`.

## Change

### `src/components/visitors/VisitorDetailsDialog.tsx`
- Add a "Date of Visit" entry in the Visit Information grid (alongside Host, Department, Gate, Purpose)
- Use the `Calendar` icon (already imported) and format the date nicely
- Display `visitor.scheduled_date` formatted as a readable date, or "—" if not set

