## Goal
Fix Admin Head visibility: Admin Head currently can't see visitor data across pages because the `isRestrictedRole` check treats them as Manager/Operator (host-only). Make Admin Head a global plant-wise viewer (read-only) on every page.

## Root cause
`isRestrictedRole` in `Visitors.tsx`, `Dashboard.tsx`, `VisitorReport.tsx`, and `Analytics.tsx` only excludes `isHoAdmin`. Admin Head has no `admin`/`gate_security` role rows, so the memo returns `true` and the visitor list is filtered down to host-matched / creator-matched rows only — meaning Admin Head sees almost nothing.

## Fix (frontend only)
In each of the 4 files, change the `isRestrictedRole` memo from:
```ts
if (isHoAdmin) return false;
```
to:
```ts
if (isHoAdmin || isAdminHead) return false;
```
(and pull `isAdminHead` from `useUserRoles()` plus add to dep array).

Files:
- `src/pages/Visitors.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/VisitorReport.tsx`
- `src/pages/Analytics.tsx`

`useSelectedLocation` already treats Admin Head as a global viewer (All Locations + per-plant switching), and RLS already grants Admin Head SELECT on all visitor-related tables, so no DB or location-switcher changes are needed.

## Result
Admin Head sees full plant-wise visitor data on Dashboard, Visitors, Visitor Report, and Analytics — across All Locations or any single selected plant — while remaining strictly read-only (no new write controls introduced).

---

## (Previous read-only work — already shipped)
Apply **strict read-only mode** across the **entire application** for the Admin Head role. Admin Head can only view plant-wise data (all plants) and download plant-wise reports. Every create / edit / approve / reject / delete / check-in / check-out / import / settings-write control is hidden across all pages.

## Already done
- `Visitors.tsx` — New Visitor button, bulk actions, Approve/Reject hidden
- `PendingApprovals.tsx` dashboard card — hidden for Admin Head
- DB RLS — Admin Head has SELECT-only at all locations
- Location switcher — All Locations available

## Remaining work (frontend only)

Single pattern everywhere:
```ts
const { isReadOnly } = useUserRoles();
// then: {!isReadOnly && <Button>...</Button>}  or  disabled={isReadOnly}
```

### 1. `src/components/visitors/VisitorActions.tsx`
Honor `canEdit === false` strictly: hide quick Approve / Reject buttons, hide Check In / Check Out / Check-in & Print quick buttons, hide Approve / Reject / Check In / Check Out dropdown items. Keep only **View Details** and **Print Badge**.

### 2. Master data pages — hide Add / Edit / Delete / Import / Bulk buttons
- `src/pages/Vehicles.tsx` (+ `AnprPanel` actions)
- `src/pages/Appointments.tsx`
- `src/pages/Employees.tsx`
- `src/pages/Departments.tsx`
- `src/pages/Gates.tsx`
- `src/pages/Locations.tsx`
- `src/pages/VehicleTypes.tsx`
- `src/pages/Watchlist.tsx`
- `src/pages/UserManagement.tsx`
- `src/pages/GateQRCodes.tsx`

### 3. Operations pages — hide write controls
- `src/pages/CheckInOut.tsx` — hide check-in/out submit buttons
- `src/pages/NewVisitor.tsx` / `NewVehicle.tsx` — redirect away or render read-only notice
- `src/pages/EmergencyEvacuation.tsx` — hide trigger/clear buttons
- `src/pages/BadgePrinting.tsx` — keep print (read-only friendly), hide edits
- `src/pages/Notifications.tsx` — keep view, hide delete/clear

### 4. Settings & admin
- `src/pages/Settings.tsx` — disable all form Save buttons across General, Branding, Policies, SMTP, Security, WhatsApp tabs
- `src/components/settings/WhatsAppSettingsPanel.tsx`

### 5. Dialogs
- `src/components/visitors/VisitorDetailsDialog.tsx` — hide action buttons (approve/reject/checkout)
- `src/components/visitors/VisitorEditDialog.tsx` — disable Save
- `src/components/visitors/CheckInDialog.tsx` & `CheckInCaptureDialog.tsx` — disable confirm

### 6. Sidebar / nav safety
- `src/components/layout/Sidebar.tsx` — quick "New Visitor" / "New Vehicle" shortcuts hidden when `isReadOnly`.
- `src/components/dashboard/QuickActions.tsx` — hide write quick-actions.

## Explicitly retained for Admin Head
- Plant-wise data view (all plants, via existing "All Locations" + location filter)
- Report download / CSV exports on `ComplianceReport`, `VisitorReport`, `VehicleReport`, `AuditLogs`, `Analytics`
- Filters, search, view details, print badge

## Out of scope
- No DB / RLS changes
- No changes to read, filter, or export flows

## Result
Admin Head can navigate the whole app, see plant-wise data across all locations, filter and download reports — but cannot trigger any write action anywhere.