## Add "Export CSV" button to Locations and Gates screens

Add a new **Export CSV** button (next to the existing **Template** / **Import** buttons) on:
- `src/pages/Locations.tsx`
- `src/pages/Gates.tsx`

### Visibility
Show the Export button only when `isHoAdmin || isAdminHead` (both read from `useUserRoles`). Other roles (Location Admin, Operator, Security, etc.) will not see it.

### Behavior
- Clicking Export downloads a `.csv` file of the currently loaded records on that page (respects the active location filter for Gates, exports all locations for HO Admin on Locations screen).
- File names: `locations-YYYYMMDD.csv` and `gates-YYYYMMDD.csv`.
- Columns mirror the existing CSV import template columns so the same file can round-trip back through Import:
  - **Locations**: name, address, city, country, phone, email, plant_code, emergency_contact, assembly_point, capacity, latitude, longitude, geo_address, status
  - **Gates**: name, location (name), building, gate_type, capacity, operating_hours_start, operating_hours_end, has_qr, status
- CSV values are quoted/escaped properly (commas, quotes, newlines).
- Toast success/error messages using existing `sonner` toast.

### Scope guardrails
- UI-only change; no DB / RLS / business-logic changes.
- No new dependencies — use a small inline CSV serializer + Blob download.
- `Gates.tsx` currently wraps the toolbar in `!isReadOnly`; the Export button will be rendered outside that wrapper so Admin Head (read-only) still sees Export.