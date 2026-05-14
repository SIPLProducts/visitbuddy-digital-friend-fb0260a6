## Goal
Widen the Schedule Appointment dialog so Host (with department/email) and Department selectors render fully without truncation.

## Change
**File: `src/pages/Appointments.tsx`** (line 538)
- `DialogContent` className: `max-w-lg` → `max-w-3xl w-[95vw]` (keeps `max-h-[90vh] overflow-y-auto`).

That's it — the inner two-column grid expands automatically and the host combobox gets enough room.
