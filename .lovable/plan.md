

## Add searchable Host dropdown to visitor forms

The current Host selector on visitor registration/edit is a plain `<Select>` — when a location has dozens/hundreds of employees the user must scroll. We'll swap it for a searchable combobox so typing filters the host list in real-time and the user can pick directly.

### What changes

**Inline registration form** (`src/pages/Visitors.tsx` — the "New Visitor" inline panel)
- Replace the Host `Select` with a `Popover + Command` combobox (shadcn pattern, already available via `@/components/ui/popover` and `@/components/ui/command`).
- Trigger is a `Button` showing the selected host's name (or "Select host…").
- Opening reveals a `CommandInput` (search box) + scrollable `CommandList` of employees filtered by name / email / employee_id.
- Selecting an item closes the popover, sets `host_id`, and keeps the existing auto-fill of department from host.
- "No host found" empty state when search yields nothing.

**Edit dialog** (`src/components/visitors/VisitorEditDialog.tsx`)
- Same combobox replacement for the Host field, preserving the existing locked-when-checked-out behaviour.

**Self-service portal** (`src/pages/SelfService.tsx`)
- Apply the same searchable combobox to the host step so external visitors can search by name too.

### Behaviour details
- Search is case-insensitive substring match across `name`, `email`, `employee_id`.
- List is virtualised by `Command`'s built-in filtering (no extra deps).
- Keyboard: ↑/↓ to navigate, Enter to select, Esc to close.
- Mobile: popover renders full-width under the trigger; input is auto-focused on open.
- Existing host fetch query (filtered by selected location + `is_host = true`) is unchanged — only the UI swaps.

### Out of scope
- Server-side host search / pagination (current dataset is small enough for client-side filter).
- Adding new hosts from the dropdown.
- Changes to appointment / vehicle host pickers.

