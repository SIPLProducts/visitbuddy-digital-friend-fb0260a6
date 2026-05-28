## Goal
Show **all** gates (in current location scope) inside the Dashboard's "Gate Status" panel, not just the first 4.

## Change
`src/components/dashboard/GateStatus.tsx`
- Remove `gates.slice(0, 4)` → render the full `gates` array passed in.
- Wrap the list in a scrollable container (`max-h-[360px] overflow-y-auto`) so the panel stays the same visual height as today but lets the user scroll through every gate.
- Keep existing row markup, status dot, badge, and capacity counter unchanged.

## Scope notes
- `Dashboard.tsx` already passes `filteredGates` to `<GateStatus />`, so location-scoping is preserved automatically.
- No DB / backend / styling-token changes. Pure presentation tweak.

## Out of scope
- Pagination, search, or sorting inside the panel.
- Changes to the new "Active Gates" stat card.
