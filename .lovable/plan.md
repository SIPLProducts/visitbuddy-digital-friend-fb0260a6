## Add searchable user picker in "Assign User to Role" dialog

**File:** `src/pages/UserManagement.tsx` (lines ~1563-1583)

Replace the plain `<Select>` for the User field with a searchable Combobox (Popover + cmdk Command), matching the pattern already used in `src/components/visitors/HostCombobox.tsx`.

### Behavior
- Trigger button shows the selected user's name (and email below) or "Select user" placeholder.
- Opens a popover with a search input that filters by **full name** and **email**.
- Empty state: "No user found."
- Selecting an item sets `assignUserId` and closes the popover.
- Width matches the trigger; max-height with scroll for long lists.

### Implementation notes
- Import `Popover`, `PopoverTrigger`, `PopoverContent`, `Command`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`, plus `Check`, `ChevronsUpDown` from lucide-react.
- Add a local `useState` for the popover open state inside the dialog (or a small inline component).
- Build the searchable `value` string per item as `"{full_name} {email} {user_id}"` so cmdk's filter matches both name and email.
- No changes to submit logic, schema, or other dialog fields (Location, Role, HO Admin) — keep those as-is.
