## Issue
The screenshot still shows `HO-030626-0084` for location `3802- BMW -MADURANTHAGAM`.

That means the visitor ID trigger is still unable to resolve a real plant code at insert time. The most likely causes are:
1. the on-prem patch/backfill scripts were not run on the Linux server, or
2. the visitor is being inserted with `gate_id = null` / wrong gate, so the trigger cannot find `gate -> location -> plant_code` and falls back to `HO`.

## Plan
1. **Harden visitor creation in the app**
   - Make `gate_id` required on `NewVisitor` so a visitor cannot be created without a gate.
   - Add a clear validation message if no gate is selected.
   - Keep the existing location-based gate filtering.

2. **Improve the on-prem repair script**
   - Update `deploy/fix-visitor-id-trigger.sh` so it prints a diagnostic table showing every gate with its location and resolved plant code.
   - Add a warning query for gates with missing `location_id` or missing location rows.
   - This will confirm immediately why any visitor would still become `HO`.

3. **Provide exact Linux commands after implementation**
   - Run the scripts from the server’s `deploy/` folder:
     ```bash
     ./fix-visitor-id-trigger.sh
     ./backfill-plant-codes.sh
     ```
   - Then create a new visitor at the same `3802- BMW -MADURANTHAGAM` location and verify the ID starts with `3802-`, not `HO-`.

## Important note
Existing old visitor IDs like `HO-030626-0084` will not automatically change. The fix affects newly created visitors after the trigger/backfill is applied on the on-prem server.