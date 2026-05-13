## Auto-fill department from host and disable the field

**File:** `src/pages/NewVisitor.tsx` (Visit Details section, ~lines 614–642)

### Current behavior
- Host picker (`HostCombobox`) already auto-sets `department_id` to the host's department on selection.
- Department `<Select>` remains editable, allowing the user to override it.

### Change
1. Disable the Department `<Select>` whenever a `host_id` is selected, so it cannot be edited.
2. When the host is cleared via `onClear`, also clear `department_id` so the field unlocks again.
3. Keep the existing auto-fill logic; no schema, validation, or submit changes.

### Notes
- Use `<Select disabled={!!form.watch('host_id')}>` to lock the field.
- Label can be updated to `Department (auto from host)` for clarity — optional, will include.
- No backend or RLS changes.
