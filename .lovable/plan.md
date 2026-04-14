

# Auto-populate Department When Host is Selected

## Problem
When registering a new visitor, selecting a Host should automatically set the Department field based on the host's department. Currently both fields are independent.

## Changes

### 1. `src/pages/NewVisitor.tsx` — Host onValueChange handler (line 576)
Update the Host select's `onValueChange` to also set `department_id` from the selected employee's department:
```tsx
onValueChange={(value) => {
  form.setValue('host_id', value);
  const selectedEmployee = employees.find(e => e.id === value);
  if (selectedEmployee?.department_id) {
    form.setValue('department_id', selectedEmployee.department_id);
  }
}}
```
Also make the Department select controlled by adding `value={form.watch('department_id')}` so it reflects the auto-populated value.

### 2. `src/components/visitors/VisitorEditDialog.tsx` — Same logic for Edit form (line ~217)
Apply the same auto-populate behavior: when host changes, set `department_id` from the selected employee's department.

### Files Changed
- `src/pages/NewVisitor.tsx` — Auto-set department on host selection
- `src/components/visitors/VisitorEditDialog.tsx` — Same auto-set in edit form

