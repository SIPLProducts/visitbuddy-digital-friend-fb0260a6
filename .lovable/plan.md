## Goal
On the Appointments screen's New/Edit Appointment dialog, replace the basic Host `Select` with the same searchable `HostCombobox` used on the Visitors (NewVisitor) screen — so it shows host name, employee ID, email, and department, with type-to-search.

## Change

**File: `src/pages/Appointments.tsx`**

1. Add import: `import { HostCombobox } from '@/components/visitors/HostCombobox';`
2. In the dialog (~line 572-590), replace the Host `<Select>...</Select>` block with:

```tsx
<HostCombobox
  value={formData.host_id || ''}
  options={employees as any}
  onChange={(id, opt) =>
    setFormData({
      ...formData,
      host_id: id,
      department_id: opt?.department?.id || formData.department_id || '',
    })
  }
  onClear={() => setFormData({ ...formData, host_id: '' })}
  placeholder="Select host"
/>
```

The existing employees query already selects `*, department:departments(*)` which includes `email` and `employee_id`, so the combobox will render the same rich rows (name - department, with employee_id • email subtitle) and search across all those fields, matching the screenshot.

## Out of scope
- Department dropdown (kept as-is, still auto-populated from selected host).
- Visitors page (already uses HostCombobox).
- Backend / RLS / queries (no changes).
