## Problem

On the on-prem Linux server (`vms.resustainability.com`), newly generated visitor IDs start with `HO-` instead of the location's plant code (e.g. `3604-`).

Root cause: the `generate_visitor_id` trigger reads `locations.plant_code` and falls back to `'HO'` when it's NULL or empty. The seed file `deploy/seed/10_locations.sql` used during on-prem import does **not** include the `plant_code` column, so every location was imported with `plant_code = NULL`. Only locations the user later edited through the Locations UI (which sets `plant_code`) generate correct IDs — that's why one row in your screenshot shows `3604-…` while the rest show `HO-…`.

This is purely a data issue on the server. No app code or trigger changes are needed.

## Fix

1. **New script `deploy/backfill-plant-codes.sh`** — one-shot script the user runs on the Linux server. It connects via `psql` (using `deploy/.env`) and:
   - Backfills `plant_code` for every location where it is NULL or empty, using the same rule as migration `20260520083425` (uppercase, alphanumeric only, first 6 chars of the location name).
   - Then runs the same de-duplication loop from that migration so two locations never collide on `plant_code` (appends `2`, `3`, … if needed).
   - Prints a before/after table of `id | name | plant_code` so the user can verify.
   - Idempotent — safe to re-run; only touches rows with missing codes.

2. **Update `deploy/seed/10_locations.sql`** — add `plant_code` to the column list and inline an `UPDATE … SET plant_code = …` block at the bottom so future fresh imports don't reproduce this. (Values derived from each location name with the same rule.)

3. **Update `deploy/generate-seed-files.sh`** (if it builds `10_locations.sql` from a template) so re-exports always include `plant_code`. If the file is hand-maintained, skip this step.

After running the script on the server, all existing visitor IDs already stored stay as-is (they're historical), but every new visitor will get the correct plant-code prefix, e.g. `3604-030626-0080`.

## Out of scope

- No changes to the `generate_visitor_id` trigger, `visitor_id_counters`, or any app code.
- No retroactive renaming of already-issued `HO-…` visitor IDs.
- Unrelated to the SMS / reminder-cron / header search work already shipped.

## Files

- `deploy/backfill-plant-codes.sh` (new, executable)
- `deploy/seed/10_locations.sql` (edit)
- `deploy/generate-seed-files.sh` (edit only if it generates the locations seed)

## Post-deploy steps for the user

```bash
cd /path/to/deploy
./backfill-plant-codes.sh
```

Then create one test visitor at each location and confirm the new ID starts with that location's plant code instead of `HO-`. Existing locations can also be fine-tuned from **Settings → Locations** (Plant Code field) if you want a shorter/custom code.
