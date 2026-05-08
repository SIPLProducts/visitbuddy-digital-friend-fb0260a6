## Goal

Replace the binary `pg_dump` workflow with a **plain-SQL seed-files workflow**: generate human-readable `.sql` files that contain all rows from the cloud DB (auth users + every `public.*` table), commit them under `deploy/seed/`, and have `deploy.sh` / `import-to-onprem.sh` simply `psql -f` them. No `cloud-export.dump` binary required.

This makes the on-prem install fully reproducible from the git repo alone — you just `git pull` and re-run a single command.

## Design

```
deploy/
├── init-schema.sql        (already exists — DDL for public.*)
├── seed.sql               (already exists — buckets + tenant_settings stub)
└── seed/                  (NEW)
    ├── 00_auth_users.sql       (auth.users + auth.identities, password hashes intact)
    ├── 10_locations.sql
    ├── 11_screens.sql
    ├── 12_tenant_settings.sql
    ├── 13_email_templates.sql
    ├── 14_vehicle_types.sql
    ├── 20_profiles.sql
    ├── 21_user_location_roles.sql
    ├── 22_role_screen_permissions.sql
    ├── 30_departments.sql
    ├── 31_employees.sql
    ├── 32_gates.sql
    ├── 40_visitors.sql
    ├── 41_accompanying_visitors.sql
    ├── 42_visitor_agreements.sql
    ├── 43_visitor_watchlist.sql
    ├── 50_vehicles.sql
    ├── 51_vehicle_entries.sql
    ├── 60_appointments.sql
    ├── 70_audit_logs.sql
    ├── 71_email_logs.sql
    ├── 72_notifications.sql
    └── 99_storage_objects.sql  (storage.objects metadata only — files come via tarball)
```

Files are numbered so dependency order is enforced (parents before children).

## Plan

### Step 1 — Create `deploy/generate-seed-files.sh`

Runs against the cloud DB and produces every `deploy/seed/*.sql` file in one shot using `pg_dump --data-only --inserts --column-inserts` per table. Why per-table? It guarantees ordering, lets us skip volatile tables (`audit_logs` / `email_logs` are optional), and produces clean diffs in git.

Skeleton:
```bash
SUPABASE_DB_URL='postgresql://postgres:<PWD>@db.<ref>.supabase.co:5432/postgres'
OUT=deploy/seed
mkdir -p "$OUT"

# Auth users (custom — INSERT ... ON CONFLICT so re-runs are safe)
pg_dump "$SUPABASE_DB_URL" --data-only --inserts \
  -t auth.users -t auth.identities \
  > "$OUT/00_auth_users.sql"

# Public tables — strict order
TABLES=(
  locations screens tenant_settings email_templates vehicle_types
  profiles user_location_roles role_screen_permissions
  departments employees gates
  visitors accompanying_visitors visitor_agreements visitor_watchlist
  vehicles vehicle_entries
  appointments
  audit_logs email_logs notifications
)
i=10
for t in "${TABLES[@]}"; do
  pg_dump "$SUPABASE_DB_URL" --data-only --inserts --column-inserts \
    -t "public.$t" > "$OUT/$(printf '%02d' $i)_$t.sql"
  i=$((i+1))
done

# storage.objects metadata
pg_dump "$SUPABASE_DB_URL" --data-only --inserts \
  -t storage.objects > "$OUT/99_storage_objects.sql"
```

Each file gets a `BEGIN;` / `COMMIT;` wrapper and a `TRUNCATE ... CASCADE;` at the top so re-running the import is idempotent.

### Step 2 — Create `deploy/import-seed.sh`

Replaces `import-to-onprem.sh` for the seed-data path. Runs on the on-prem box:

```bash
sudo bash deploy/import-seed.sh [optional storage-export.tgz]
```

What it does:
1. Source `config.env` to get `POSTGRES_PASSWORD` + `STORAGE_VOL`.
2. Stop the `functions` container.
3. `psql -f deploy/seed/00_auth_users.sql` … through `99_storage_objects.sql` in numeric order.
4. Re-apply Supabase role grants (same block as the existing repair script).
5. If a `storage-export.tgz` is passed, rsync it into `$STORAGE_VOL`.
6. `NOTIFY pgrst, 'reload schema'` and restart `rest auth storage realtime meta`.
7. Verify `/rest/v1/locations` returns 200.

### Step 3 — Wire it into the existing scripts

- **`deploy/deploy.sh`**: after `init-schema.sql` runs, if `deploy/seed/` exists, automatically run `import-seed.sh` (no flags). New installs come up pre-populated with cloud data.
- **`deploy/update.sh`**: add an optional `--reseed` flag that runs `import-seed.sh` (handy when you push new seed files).
- **`deploy/README.md`**: add a new section **"Seed-data workflow (preferred)"** explaining the two-step flow:
  ```bash
  # On dev/cloud-connected machine:
  SUPABASE_DB_URL='...' bash deploy/generate-seed-files.sh
  git add deploy/seed && git commit -m "Refresh seed data"
  
  # On on-prem server:
  git pull && sudo bash deploy/import-seed.sh
  ```

### Step 4 — Storage files

`storage.objects` rows alone don't include the actual JPEG/PNG bytes. Two options:

- **(a)** Keep using `export-from-cloud.sh` for the `storage-export.tgz` (storage files only — DB no longer needed there). `import-seed.sh` accepts it as an optional second arg.
- **(b)** Skip storage entirely and let users re-upload visitor photos / branding from the on-prem UI.

Recommended: **(a)** — storage tarball is small, and visitor photos are useful historical data.

## Trade-offs (be aware)

- **Seed files will be large.** If cloud has 10k visitors, `40_visitors.sql` could be 5–20 MB. Git can handle this, but diffs are noisy. We can `.gitignore deploy/seed/40_visitors.sql 41_*.sql 70_*.sql 71_*.sql` and treat those as "regenerated each time, never committed", while still committing the small reference tables (locations, screens, tenant_settings, employees, gates, departments, vehicle_types, role mappings).
- **`auth.users` contains password hashes.** Committing them to git effectively snapshots passwords for everyone. Safer: keep `00_auth_users.sql` out of git (`.gitignore`) and ship it via `scp` to the on-prem server, like the binary dump today.
- **No CDC / live sync.** The seed is a snapshot at generation time. Re-run `generate-seed-files.sh` whenever you want a fresh snapshot.

## Recommended split

| Committed to git | Generated each run, NOT in git |
|---|---|
| `10_locations.sql` | `00_auth_users.sql` |
| `11_screens.sql` | `40_visitors.sql` |
| `12_tenant_settings.sql` | `41_accompanying_visitors.sql` |
| `13_email_templates.sql` | `42_visitor_agreements.sql` |
| `14_vehicle_types.sql` | `50_vehicles.sql` |
| `20_profiles.sql` | `51_vehicle_entries.sql` |
| `21_user_location_roles.sql` | `60_appointments.sql` |
| `22_role_screen_permissions.sql` | `70_audit_logs.sql` |
| `30_departments.sql` | `71_email_logs.sql` |
| `31_employees.sql` | `72_notifications.sql` |
| `32_gates.sql` | `99_storage_objects.sql` |

Reference data is committed (small, useful for fresh installs), transactional data is regenerated (large, sensitive, time-sensitive).

## Question before I implement

Three things to confirm:

1. **Auth users**: keep `00_auth_users.sql` out of git and ship via scp (recommended), or commit it too? Committing it puts password hashes in git history.
2. **Visitor / vehicle history**: include in seed files or fresh start on-prem? If you want history, we generate large `.sql` per import; if not, the on-prem starts empty and grows organically.
3. **Storage files (photos)**: keep using the `storage-export.tgz` tarball helper from `export-from-cloud.sh`, or skip and let users re-upload?

Once you answer, I'll implement Steps 1–3 and update the README in one go.
