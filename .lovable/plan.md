

# Visitor Details Dialog Improvements & Gate Security Edit Access

## Changes

### 1. `src/components/visitors/VisitorDetailsDialog.tsx` — Reorder fields, add scroll, show all details

- Add `max-h-[70vh] overflow-y-auto` to the content wrapper for scrollability
- Move **Govt ID Number** inside the Visit Information section, directly after Purpose
- Add **Mobile Details** section (when `has_mobile` is true) showing brand and serial — currently missing
- Add **Checkout Method** display (when present)
- Add **Checkout By** info if available
- Ensure all collected fields are visible: photo (if URL exists), created date, date of visit, host, department, gate, purpose, govt ID, vehicle info, timing, laptop details, mobile details, accompanying count

### 2. `src/pages/Visitors.tsx` — Allow Gate Security to edit visitors

- Change line 721 from `canEdit={!isGateSecurityOnly}` to `canEdit={!isRestrictedRole}` (or simply `canEdit={isGateSecurity || isHoAdmin || userRoles.some(r => r.role === 'admin')}`)
- This allows Gate Security users to access the Edit option while still blocking Manager/Operator roles per existing restriction logic

## Files Changed
- `src/components/visitors/VisitorDetailsDialog.tsx` — Reorder Govt ID after Purpose, add scrollbar, add mobile details section
- `src/pages/Visitors.tsx` — Enable Edit for Gate Security role

