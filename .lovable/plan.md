## Show Accompanying Visitors data everywhere

Currently `accompanying_visitors` rows (name, phone, laptop, mobile) are captured during registration but only the **count** is shown anywhere. This plan surfaces the full list across the four areas the user picked.

### 1. Shared fetch helper
- In `src/pages/Visitors.tsx` (and report pages), extend the visitors query to also pull the related rows:
  ```ts
  .select('*, host:employees(...), department:departments(*), gate:gates(*), accompanying:accompanying_visitors(*)')
  ```
- Add `accompanying?: AccompanyingVisitor[]` to the `Visitor` interface in `src/types/database.ts` so all consumers get typing.

### 2. Visitor Details dialog (`VisitorDetailsDialog.tsx`)
- Replace the existing single-line "Accompanying persons: N" block with a new section **"Accompanying Visitors (N)"** that lists each person as a row showing:
  - Name, phone
  - Laptop badge (brand + serial) when `has_laptop`
  - Mobile badge (brand + IMEI) when `has_mobile`
- If the relation isn't preloaded, lazy-fetch from `accompanying_visitors` when the dialog opens (`useEffect` keyed on `visitor.id`).

### 3. Visitors table (`Visitors.tsx`)
- In the existing "Accompanying" / count column, render the count with a small `Users` icon plus a hover tooltip listing the names (first 5, "+N more"). Keeps row height stable, full detail still in dialog.

### 4. Printed badge (`PrintBadge.tsx` + `SafetyPermitBadge.tsx`)
- Fetch `accompanying_visitors` alongside the visitor.
- Add a compact "Accompanying" block on the badge listing names (and phone where space allows). Shown only when count > 0; gracefully wraps. No layout overhaul — just an added section near the visitor info.

### 5. Reports
- **VisitorReport.tsx**: include accompanying names in the existing per-visitor detail/expand view, and add an "Accompanying" column (count + names truncated) in CSV/PDF export.
- **ComplianceReport.tsx**: add accompanying count + names list to each visitor entry exported.

### Data / backend
- No schema changes. `accompanying_visitors` table and its RLS already allow read. No new migrations.

### Out of scope
- Editing accompanying records from the dialog (view-only here).
- Notifications/WhatsApp changes for accompanying persons.
