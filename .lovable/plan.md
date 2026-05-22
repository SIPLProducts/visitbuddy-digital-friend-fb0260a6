## Goal
Add a new global, read-only role **"Admin Head"** that can view data and download reports across **all plants/locations**, but cannot create, edit, approve, or delete anything.

## Approach
Mirror the HO Admin pattern (global cross-location visibility) but strip every write/approve/delete capability. Implementation has 3 layers: database, role hooks, and UI guards.

---

## 1. Database (migration)

- Add a new boolean column on `public.user_location_roles`:
  - `is_admin_head boolean NOT NULL DEFAULT false`
  (Kept as a flag alongside `is_ho_admin` so it's a global marker, independent of location/role enum.)
- New SECURITY DEFINER helper:
  - `public.is_admin_head(_user_id uuid) returns boolean` — mirrors `is_ho_admin`.
- Update **SELECT** RLS policies on every tenant table to also allow `is_admin_head(auth.uid())`:
  - `visitors`, `accompanying_visitors`, `vehicles`, `vehicle_entries`, `anpr_events`, `appointments`, `audit_logs`, `sms_logs`, `email_logs`, `notifications` (admin-head sees all), `departments`, `employees`, `gates`, `locations`, `profiles`, `user_location_roles`, `role_screen_permissions`, `screens`, `visitor_watchlist`, `visitor_agreements`, `frequent_visitors`, `tenant_settings`, `email_config`, `email_templates`, `vehicle_types`.
- **Do NOT** add `is_admin_head` to any INSERT / UPDATE / DELETE / ALL policy → guarantees read-only at the DB layer even if UI is bypassed.
- Prevent privilege escalation: tighten `user_location_roles` write policies so Location Admins cannot set `is_admin_head = true` (same pattern already used for `is_ho_admin`).

## 2. App role hook (`src/hooks/useUserRoles.ts`)

- Surface `isAdminHead = roles.some(r => r.is_admin_head)`.
- Update `canAccessLocation` / `hasRoleAtLocation` / `getAccessibleLocationIds` so Admin Head sees **all locations** (same branch as `isHoAdmin`, but only for reads).
- Add a single source of truth `isReadOnly = isAdminHead && !isHoAdmin && !isLocationAdmin`.

## 3. UI guards

- `useScreenPermissions.ts`: treat Admin Head like HO Admin for `canViewScreen`, but force `canEditScreen` to always return `false`.
- `MainLayout` / `Sidebar`: show every nav item (since Admin Head can view all screens). Hide screens that are purely action-oriented with no view value (e.g. `NewVisitor`, `NewVehicle`, `CheckInOut`, `ApproveVisitor`, `TransferApproval`, `SelfService`).
- Hide/disable action buttons across pages when `isReadOnly`:
  - Visitors: New Visitor, Edit, Approve, Check-in, Check-out, Bulk actions, Delete.
  - Vehicles, Appointments, Employees, Departments, Gates, Locations, Watchlist, Vehicle Types, User Management, Settings: Add / Edit / Delete / Save.
  - Reports & Analytics: keep Download/Export buttons enabled.
- Header role label: show **"Admin Head"** (extend the existing `headerRoleLabels` mapping).
- Defense in depth: an `withReadOnlyGuard` wrapper around mutating Supabase calls in shared hooks is **not** added — RLS already blocks it; UI guards are for UX.

## 4. Seeding / assigning the role

- Admin Head is assigned by an HO Admin from **User Management** by toggling a new "Admin Head (Global, Read-only)" switch on a user's role row (works exactly like the existing HO Admin toggle, mutually compatible — a user can be both, but HO Admin already implies full access).
- No edge-function changes required; existing `list-user-emails` etc. already allow HO Admin + Location Admin, so add `isAdminHead` to those allow-lists where read-only listing is needed (User Management, audit logs viewer).

---

## Technical notes (for the dev)

- Plant-wise filtering for Admin Head reuses the existing location selector in `useSelectedLocation` — no new query logic needed; pages already filter `visitors`, `vehicle_entries`, etc. by selected location, and "All locations" works because RLS now permits cross-location SELECT.
- Reports (`VisitorReport`, `VehicleReport`, `ComplianceReport`, `Analytics`) already compute exports from `filteredVisitors` client-side → automatically work for Admin Head once SELECT RLS is opened.
- Demo credentials grid (`mem://auth/demo-credentials`) gets one new tile: `adminhead@demo / 123456`.

## Out of scope
- No changes to edge functions that perform writes (they already require admin/manager — Admin Head simply won't call them because UI hides those actions).
- No new pages.

Approve this plan and I'll implement it as a single migration + frontend patch.