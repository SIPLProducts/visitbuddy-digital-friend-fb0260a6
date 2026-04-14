

# Move "Date of Visit" Before "Full Name" in Visitor Form

## Changes

### 1. `src/pages/NewVisitor.tsx`
- Move the "Date of Visit" date picker block (lines 608-633) to be the first field inside the Personal Information card, before the "Full Name" field (before line 253)
- Place it as a full-width field above the name/email grid

### 2. `src/components/visitors/VisitorEditDialog.tsx`
- Move the "Date of Visit" field to the top of the form, before the Name field (currently at the bottom of the grid)

No database or type changes needed.

