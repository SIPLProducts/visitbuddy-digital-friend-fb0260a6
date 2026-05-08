## Goal

Copy **everything** that exists in the Lovable Cloud Supabase project (`bzyvykyuiuihzvhdpxsi`) into the on-prem Supabase running at `10.100.4.36`, including:

- All `public.*` tables (locations, user_location_roles, visitors, vehicles, employees, screens, …)
- The `auth.users` table — so the same emails, UUIDs, and password hashes work on-prem
- The `storage.objects` metadata + the actual files in the `visitor-photos` and `branding` buckets

After this, `bala@sharviinfotech.com` will log in on-prem with the **same** UUID stored in `public.user_location_roles.is_ho_admin = true`, so the header shows **HO Admin** and User Management opens.

## Why bala currently shows "No role"

When the on-prem stack came up, bala signed up fresh in the on-prem `auth.users` and got a **new UUID**. The `public.user_location_roles` row that says `is_ho_admin = true` was either:
- Not yet imported from cloud, or
- Imported but pointing to the **cloud** UUID (which doesn't exist in the on-prem `auth.users`).

So `select * from user_location_roles where user_id = auth.uid()` returns 0 rows → header shows "No role" → User Management is hidden.

The fix is to do a real cloud → on-prem migration so the auth UUIDs and the role rows match.

## Plan

### Step 1 — Run the export from the cloud project

On any machine with `pg_dump` (≥15), `curl`, `jq`, `tar`:

```bash
export SUPABASE_DB_URL='postgresql://postgres.bzyvykyuiuihzvhdpxsi:<DB_PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres'
export SUPABASE_URL='https://bzyvykyuiuihzvhdpxsi.supabase.co'
export SUPABASE_SERVICE_ROLE_KEY='<service role key>'

bash deploy/export-from-cloud.sh
```

Produces:
- `cloud-export.dump` — pg_dump of `public + auth + storage` schemas (custom format)
- `storage-export.tgz` — files from `visitor-photos` + `branding` buckets

The DB password is the Postgres password from **Lovable Cloud → Connect → Database**.
I will tell you exactly where to copy it from before you run this.

### Step 2 — Copy both files to the on-prem server

```bash
scp cloud-export.dump storage-export.tgz vmsadm@10.100.4.36:/home/vmsadm/
```

### Step 3 — Wipe the stale on-prem rows so the cloud UUIDs win

The current on-prem DB has a fresh `bala` row in `auth.users` with a different UUID. We need to remove that fresh row before restore so `pg_restore --clean` doesn't get confused. Add a small pre-restore SQL block in `deploy/import-to-onprem.sh` that runs **before** `pg_restore`:

```sql
-- Drop any locally-created auth.users so the cloud rows are the source of truth
TRUNCATE auth.users CASCADE;
TRUNCATE public.user_location_roles CASCADE;
TRUNCATE public.profiles CASCADE;
```

### Step 4 — Run the import on the on-prem server

```bash
sudo bash /home/vmsadm/resl/vvms/frontend/deploy/import-to-onprem.sh \
  /home/vmsadm/cloud-export.dump \
  /home/vmsadm/storage-export.tgz
```

The script already:
- Stops `functions`, runs `pg_restore --clean --if-exists`
- Re-applies all role grants (the PGRST002 fix from earlier)
- Re-creates buckets and rsyncs files
- Restarts `rest / auth / storage / realtime / meta`
- Verifies `/rest/v1/locations` returns 200

### Step 5 — Verify

On the on-prem DB (one-liner):

```sql
SELECT u.email, r.role, r.is_ho_admin
FROM auth.users u
LEFT JOIN public.user_location_roles r ON r.user_id = u.id
WHERE u.email = 'bala@sharviinfotech.com';
```

Expected: one row with `is_ho_admin = true`. Then refresh the browser — header shows **HO Admin**, User Management opens, all visitors/vehicles/employees from cloud are visible.

## Edits needed in this loop

1. **`deploy/import-to-onprem.sh`** — add the pre-restore TRUNCATE block from Step 3.
2. **`deploy/README.md`** — add a new section **"Full data migration from Lovable Cloud"** that walks through Steps 1–5 above with the exact commands.
3. **`deploy/export-from-cloud.sh`** — already correct; no change needed.

## Things you (the user) need to provide once

- The **Postgres connection string** for the cloud project (from Lovable Cloud → Connect → Database).
- The **service role key** for the cloud project (from Lovable Cloud → Connect → API).

Both are pasted as env vars when running `export-from-cloud.sh` — they never get stored in code or committed.

## Confirm before I implement

Do you want me to:
- (a) Make the script edits in Steps 1–3 above and update the README, then walk you through running the export/import; **or**
- (b) Just write a one-shot SQL repair (faster, but you'd have to re-do it every time cloud changes) that re-points the existing on-prem `bala` UUID to the HO‑Admin row without doing a full data migration?

I recommend **(a)** because you said "whatever data is present in cloud we have to migrate" — that's a one-time full sync and gives you all visitors/vehicles/employees too, not just the admin role.
