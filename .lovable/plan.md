## Plan

1. **Restore the database trigger**
   - Add a migration that creates `generate_visitor_id_trigger` on `public.visitors`.
   - This trigger will run before every new visitor insert and call the existing `generate_visitor_id()` function.
   - Result: when the app does not send a `visitor_id`, the database will generate IDs like `CORPOR-200526-0001` or `CDHYD-200526-0001`.

2. **Stop frontend manual VIS ID generation**
   - Update `src/pages/NewVisitor.tsx` to stop generating `VIS-XXXXXXXX-XXXX` client-side.
   - Remove `visitor_id` from the insert payload so the database trigger assigns the correct ID.
   - Return `id, visitor_id` after insert so notifications and UI still work.

3. **Fix CSV/bulk visitor import**
   - Update `src/pages/VisitorReport.tsx` to stop assigning `visitor_id: generateVisitorId()` during CSV import.
   - Let each imported row receive the plant/date/sequence ID from the database.

4. **Important note about old records**
   - Existing `VIS-...` visitor IDs will remain unchanged, as requested earlier.
   - Only newly created visitors after this fix will get the plant-code format.

## Technical details

- Root cause: the migration updated the `generate_visitor_id()` function, but the live database currently has no trigger on `visitors`, and `NewVisitor.tsx` still manually inserts `VIS-...` IDs.
- Existing self-service QR flow already omits `visitor_id`, so after the trigger is restored it will also receive the new format automatically.
- Counter scope remains per plant code through `visitor_id_counters.location_key`.