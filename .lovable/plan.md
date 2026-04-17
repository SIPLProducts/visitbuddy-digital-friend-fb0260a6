
User clarification: They don't want the location name suffix. The issue is that within a single location they have multiple gates all literally named "Main Gate" (or similar), so they can't tell them apart. The differentiator should be the **building** (e.g., "Admin Building", "Factory Building") which is already a column on the `gates` table (`building text`).

# Show Building name to disambiguate Gate dropdowns

## Problem
Within a single location, multiple gates may share generic names like "Main Gate" (e.g., Admin Building Main Gate, Factory Building Main Gate). The dropdowns currently only show `gate.name`, so they all look identical.

## Fix
The `gates` table already has a `building` column. Display it next to the gate name in every Gate `<Select>` so each option becomes uniquely identifiable.

Format: `"<Gate Name> — <Building>"` (only append the dash + building if `building` is present).

## Changes

### Files to update (Gate dropdown options only)
- `src/pages/NewVisitor.tsx`
- `src/components/visitors/VisitorEditDialog.tsx`
- `src/pages/NewVehicle.tsx`
- `src/pages/Visitors.tsx` (if Gate filter dropdown exists)
- `src/pages/Appointments.tsx` (if Gate field exists)
- Any other screen with a Gate selector found during implementation

### Code change pattern
No query change required (`building` is already returned by `select('*')`).

```tsx
<SelectItem key={gate.id} value={gate.id}>
  {gate.name}{gate.building ? ` — ${gate.building}` : ''}
</SelectItem>
```

## Expected result
- Operators see e.g. `Main Gate — Admin Building`, `Main Gate — Factory Building` and can pick the correct one.
- Gates with no building set continue to show just the gate name (no trailing dash).
- No DB or query changes; purely a UI label tweak.
