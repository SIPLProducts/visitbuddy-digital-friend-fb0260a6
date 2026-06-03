## Problem

On `vms.resustainability.com`, the first visitor gets the correct plant-code prefix (e.g. `3604-…`) but subsequent visitors fall back to `HO-…`.

Root cause: the `generate_visitor_id` trigger reads `locations.plant_code` via the chosen gate. Most on-prem locations were imported from `deploy/seed/10_locations.sql` with `plant_code = NULL`. The one location whose `plant_code` was filled in via the UI works correctly; everything else falls through to the hard-coded `'HO'`. The "1st OK / 2nd HO" pattern matches the user picking different gates/locations between the two registrations — one happens to be the only fixed row.

The `deploy/backfill-plant-codes.sh` script created in the last turn would fix this, but the user hasn't run it yet, and there's no safety net inside the trigger itself if a new location is ever added without a plant code.

## Fix

Two layers — DB-level safety net + on-prem data backfill.

### 1. Harden the trigger (migration, runs on cloud DB)

Change `public.generate_visitor_id` so that when `locations.plant_code` is NULL/empty, instead of falling back to the literal `'HO'`, it derives the prefix from the location name the same way the Locations UI does:

```text
UPPER(SUBSTRING(REGEXP_REPLACE(name, '[^A-Za-z0-9]', '', 'g') FROM 1 FOR 6))
```

Only if both `plant_code` AND `name` are empty (or the gate has no `location_id` at all) does it fall back to `'HO'`. This guarantees every location with a real name produces a real prefix, even if an admin forgets to set `plant_code`.

No schema changes — just a `CREATE OR REPLACE FUNCTION`.

### 2. Apply the same fix on the on-prem server

The cloud migration doesn't reach the on-prem Postgres. Two things for the Linux box:

- **New `deploy/fix-visitor-id-trigger.sh`** — runs the same `CREATE OR REPLACE FUNCTION` against the on-prem DB via `psql` (uses `deploy/.env`, same pattern as `backfill-plant-codes.sh`). One-shot, idempotent.
- **Update `deploy/init-schema.sql`** with the new trigger body so any fresh install gets it.

User runs in this order on the server:

```bash
cd /path/to/deploy
./fix-visitor-id-trigger.sh    # patches the trigger (permanent safety net)
./backfill-plant-codes.sh      # cleans up existing NULL plant_code rows
```

After that, every gate produces a real prefix and `HO-` only appears for the literal "Corporate Headquarters" / HO location (which is correct).

## Out of scope

- Renaming already-issued `HO-…` visitor IDs (historical).
- Any UI / form changes — the registration form is fine.
- `visitor_id_counters` cleanup.

## Files

- New migration on cloud DB: `CREATE OR REPLACE FUNCTION public.generate_visitor_id …` (trigger logic only).
- `deploy/fix-visitor-id-trigger.sh` (new, executable).
- `deploy/init-schema.sql` (update the function body to match).
- `deploy/backfill-plant-codes.sh` (already created last turn — unchanged).
