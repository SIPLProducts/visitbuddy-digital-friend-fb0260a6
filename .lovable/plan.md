

# Add Aadhaar Number to Registration Form & Remove from Check-In

## Summary
Add an Aadhaar/Government ID field in the visitor registration form so it's collected upfront. Remove the ID entry step from the check-in dialog since it will already be captured during registration.

## Changes

### 1. `src/pages/NewVisitor.tsx`
- Add `govt_id_number: z.string().optional()` to the Zod schema
- Add an "Aadhaar Number" input field after the Phone/Company row in the Personal Information card
- Include `govt_id_number` in the insert payload

### 2. `src/components/visitors/CheckInDialog.tsx`
- Remove the `govtIdNumber` state and the ID entry step entirely
- Remove the two-step flow (`id` → `nda`). Instead, go directly to NDA step if enabled, or confirm immediately
- Update `onConfirm` call to pass empty string (since ID is no longer collected here)
- Simplify the dialog to show only the NDA/signature step (if enabled) or a simple confirmation

### 3. `src/components/visitors/VisitorEditDialog.tsx`
- Add `govt_id_number` field to the edit form so it can be updated after registration

No database changes needed — `govt_id_number` column already exists on the `visitors` table.

