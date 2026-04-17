
User wants the New Visitor / Edit Visitor form dropdowns (Host/Employee, Gate, Department) to be filtered by the visitor's selected Location, similar to what was done for the Employees form.

Let me check the relevant files quickly.
<lov-tool-use id="toolu_vrtx_01Xeoktdm6E2g8zMFWeFSodd" name="code--search_files" integration-id="code" data="{\"query\": \"location_id\", \"include_patterns\": \"src/pages/NewVisitor.tsx,src/pages/Visitors.tsx,src/components/visitors/VisitorEditDialog.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_016k1wNNJNNur4jqVTyYLJeH" name="code--search_files" integration-id="code" data="{\"query\": \"location_id|gate_id|department_id|host_id\", \"include_patterns\": \"src/pages/NewVisitor.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01HzHaCnG8bBs9vBkBSxMn28" name="code--list_dir" integration-id="code" data="{\"dir_path\": \"src/pages\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01QY1Kf5D9svNv2eYQbTp8xj" name="code--search_files" integration-id="code" data="{\"include_patterns\": \"src/pages/NewVisitor.tsx\", \"query\": \"fetchEmployees|fetchDepartments|fetchGates|from\\\\('employees|from\\\\('gates|from\\\\('departments|setEmployees|setGates|setDepartments\"}">
</lov-tool-use>
I have enough context. The NewVisitor (and likely VisitorEditDialog) form fetches all employees/gates/departments without scoping to the selected location. Same as the Employees fix done earlier.

<lov-plan>

# Scope Hosts, Gates & Departments to selected Location in Visitor forms

## Problem
In the New Visitor form (`src/pages/NewVisitor.tsx`) and the Edit Visitor dialog (`src/components/visitors/VisitorEditDialog.tsx`), the Host, Department, and Gate dropdowns currently load every record across all locations. They should only show items belonging to the location currently selected in the global header.

## Changes

### 1. `src/pages/NewVisitor.tsx`
- Use `useSelectedLocation()` to read `selectedLocationId` and `isAllLocations`.
- In `fetchFormData`, scope each query to the active location when a specific one is selected:
  - `departments`: `.eq('location_id', selectedLocationId)`
  - `employees`: `.eq('location_id', selectedLocationId)` (host list)
  - `gates`: `.eq('location_id', selectedLocationId)` (entry gates)
- Re-run `fetchFormData` whenever `selectedLocationId` changes (add to `useEffect` deps).
- When the location changes, reset `host_id`, `department_id`, and `gate_id` so a stale selection from another location can't be saved.
- HO Admin "All Locations" → no extra `.eq` filter (current behaviour preserved).

### 2. `src/components/visitors/VisitorEditDialog.tsx`
- Same treatment: import the hook, scope `fetchEmployees` and `fetchDepartments` (and add a gate fetch if/when relevant) by `selectedLocationId`.
- When opening the dialog for a visitor whose location differs from the active one, still show that visitor's saved values; just constrain the *available* options in the dropdowns to the active location.

### 3. Cross-field consistency (already partly working)
- Selecting a Host auto-fills the Department — this stays the same; since hosts are now location-scoped, the auto-filled department will also belong to the active location.

## Files changed
- `src/pages/NewVisitor.tsx`
- `src/components/visitors/VisitorEditDialog.tsx`

## Expected result
- A non-HO user (or HO Admin with a specific location selected) opening "New Visitor" sees only Hosts, Departments, and Gates that belong to that location.
- Switching the location in the global header instantly refreshes the dropdown options.
- HO Admin with "All Locations" continues to see every host/department/gate (unchanged).

