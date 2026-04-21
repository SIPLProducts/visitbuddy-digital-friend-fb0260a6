

## Distinguish gates by their building/area, not by location

You want the gate dropdown to show what makes each gate unique within a location — the building or area it serves (e.g. "Main Entry — Workshop", "Main Entry — Admin Block") — not the location name. The location is already implied by the location filter on the same form.

### 1. Gate label format

New label rule, applied everywhere a gate is selected:

- If `gate.building` is set → `"{gate.name} — {gate.building}"`  e.g. `Main Entry — Workshop`
- If `gate.building` is empty → `"{gate.name}"` (plain)

No location name, no city. The dropdown stays scoped to the chosen location so there's no ambiguity across sites.

### 2. Filter gates by selected location

On every form that has both a Location and a Gate field, the gate list is filtered to gates whose `location_id` matches the currently selected location. If the location changes after a gate was picked, the gate field is cleared so a stale cross-location gate can't be submitted.

Files updated:

- **`src/pages/NewVisitor.tsx`** — visitor registration form
- **`src/pages/NewVehicle.tsx`** — vehicle registration form
- **`src/pages/Visitors.tsx`** — Gate filter on the visitors list
- **`src/pages/SelfService.tsx`** — public self-service portal (gate is pre-filled from URL; label still uses the new rule)

For each: fetch gates with `select('id, name, building, location_id')`, render `gate.building ? \`${gate.name} — ${gate.building}\` : gate.name`, and (where applicable) `.filter(g => !selectedLocationId || g.location_id === selectedLocationId)`.

### 3. Encourage filling `building` on gates

So the disambiguation actually works, the **Gates** management page (`src/pages/Gates.tsx`) gets a small UX nudge on the create/edit form:

- Re-label the existing `building` field to **"Building / Area"**.
- Add helper text: *"Shown next to the gate name in dropdowns. Use this to distinguish gates within the same location, e.g. Workshop, Admin Block, Warehouse."*
- No schema changes — the `building` column already exists.

### Verification

```text
1. Gates page → edit a gate → set Building/Area to "Workshop". Save.
2. New Visitor → pick "Hyderabad HQ" as Location.
   → Gate dropdown lists only Hyderabad HQ gates.
   → Gates with a building show as "Main Entry — Workshop".
   → Gates without one show as plain "Main Entry".
3. Change Location to another site.
   → Selected gate clears.
   → New gate list reflects the new location.
4. Visitors page → set the Location filter, then the Gate filter.
   → Same scoped behaviour, same labels.
5. Self-service portal opened via a gate QR.
   → Gate stays pre-filled; label uses the new format.
```

### Out of scope
- Gate-level scoping in user roles (still location-level).
- Renaming gates in the database (you keep "Main Entry"; building disambiguates).
- ANPR camera dropdown.

