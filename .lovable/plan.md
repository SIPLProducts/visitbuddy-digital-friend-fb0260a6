## Goal
On the Appointments screen, when a Host is selected in the New/Edit Appointment dialog, automatically populate the Department field with that host's department.

## Change

**File: `src/pages/Appointments.tsx`** (Host Select, ~line 574)

Update the Host `Select`'s `onValueChange` so it also sets `department_id` from the chosen employee's `department.id`:

- Look up the selected employee in the existing `employees` array (already loaded with `department:departments(*)`).
- Set both `host_id` and `department_id` in one `setFormData` call.
- If the employee has no department, leave `department_id` empty so the user can pick one manually.

No DB, RLS, query, or UI layout changes. Department dropdown still remains editable so the user can override.

## Out of scope
- Filtering Department list by host (still shows all departments for the location).
- NewVisitor screen (separate flow).