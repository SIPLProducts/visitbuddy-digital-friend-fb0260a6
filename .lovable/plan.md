

# Fix Visitors location filter to include records without a gate

## Confirmed root cause (verified in DB)
- Location **C&D HYD** has 1 visitor ("Suresh") but their `gate_id IS NULL`.
- Their `department_id` and `host_id` both belong to C&D HYD.
- Current filter in `Visitors.tsx` line 346: `visitor.gate?.location_id === locationFilter` — only checks gate, so the visitor is excluded.
- Same issue affects `VisitorReport.tsx` and `ComplianceReport.tsx`.

## Fix strategy
Resolve a visitor's effective location from **any** of these (in order):
1. `visitor.gate.location_id` (most reliable — actual entry gate)
2. `visitor.department.location_id` (fallback — host's department)
3. `visitor.host.location_id` (fallback — host employee)

If any of those equals the selected location, the visitor matches. This way every visitor that "belongs" to C&D HYD shows up, even without a gate assigned (e.g. self-service / pre-registered).

## Changes

### 1. `src/pages/Visitors.tsx`
- Update the visitors fetch query to also pull location info from department and host:
  ```ts
  .select(`
    *,
    gate:gates(id, name, building, location_id),
    department:departments(id, name, location_id),
    host:employees!visitors_host_id_fkey(id, name, location_id)
  `)
  ```
- Replace the `matchesLocation` check with:
  ```ts
  const visitorLocationIds = [
    visitor.gate?.location_id,
    visitor.department?.location_id,
    visitor.host?.location_id,
  ].filter(Boolean);
  const matchesLocation =
    locationFilter === 'all' || visitorLocationIds.includes(locationFilter);
  ```

### 2. `src/pages/VisitorReport.tsx`
- Same query expansion (add `department` and `host` joins with `location_id`).
- Same multi-source `matchesLocation` logic.

### 3. `src/pages/ComplianceReport.tsx`
- Same query expansion + same filter logic.

## Behaviour after fix
- Switching header to **C&D HYD** → "Suresh" (and any future gate-less visitor whose host/department belongs to C&D) now appears.
- Locations that already work (HWMP, etc.) remain unaffected — the gate match is still the primary signal.
- HO Admin "All Locations" → unchanged.
- Filter dropdowns (status, department, gate, search) continue to apply on top of the location match.

## Files changed
- `src/pages/Visitors.tsx`
- `src/pages/VisitorReport.tsx`
- `src/pages/ComplianceReport.tsx`

