## Why 16 fails

`16_profiles.sql` inserts 54 rows into `public.profiles`, each with a `user_id` that must already exist in `auth.users`. The repo intentionally does NOT ship password hashes, so `00_auth_users.sql` is missing — those 54 auth users don't exist yet on your on-prem Postgres. The very first row, `d4fb503e-...-798f` (your admin Bala), trips the FK and aborts the whole file.

## Plan: generate one bootstrap SQL file you can run in Studio before 16

Add a **new committed file** `deploy/seed/00_auth_users_bootstrap.sql` that:

1. Inserts a row into `auth.users` for **every** `user_id` referenced by `16_profiles.sql` and `17_user_location_roles.sql` (54 unique IDs).
2. Uses a **single shared bcrypt hash** for password `Sharvi@123` (precomputed constant — no runtime hashing needed).
3. Recovers real emails where possible by joining profile `full_name` against the employee names in `20_employees.sql`. Falls back to `<slug>+<short-id>@local.visiguard` for the few profiles with no employee match (e.g. "Bala", "Priya Sharma", "Resl Admin").
4. Hard-codes `bala@sharviinfotech.com` for user_id `d4fb503e-...-798f`.
5. Fields set: `instance_id='00000000-0000-0000-0000-000000000000'`, `aud='authenticated'`, `role='authenticated'`, `email_confirmed_at=now()`, `created_at=now()`, `updated_at=now()`, `raw_app_meta_data='{"provider":"email","providers":["email"]}'`, `raw_user_meta_data` carries `full_name`.
6. Also inserts matching `auth.identities` rows (`provider='email'`, `provider_id=email`, `identity_data` jsonb).
7. Wraps everything in `ON CONFLICT (id) DO NOTHING` so it's safe to re-run.

I'll generate the file once locally by parsing `16_profiles.sql` + `20_employees.sql`, so the SQL is fully static — no shell needed in Studio.

## Your manual workflow after I implement

In Supabase Studio SQL editor on your on-prem box:

1. Run `deploy/seed/00_auth_users_bootstrap.sql` ← **new file**
2. Re-run `deploy/seed/16_profiles.sql` ← FK now passes
3. Continue with `17_user_location_roles.sql` and the rest

Default login for every seeded account: password `Sharvi@123`. Admin can rotate passwords from User Management afterwards.

## Also (small) — wire it into `import-seed.sh` so future automated deploys don't need this manual step

Add a check in `import-seed.sh`: if `00_auth_users.sql` is absent but `00_auth_users_bootstrap.sql` exists, run the bootstrap automatically before the rest of the seeds, and remove the "skipped" warning.

## Confirm before I implement

1. **Password convention**: `Sharvi@123` for all 54 accounts (matches your admin password), OR `123456` (matches the existing demo-credentials convention)?
2. **Synthetic emails** for the ~7 profiles with no employee match (Bala, Priya Sharma, Rahul Verma, Amit Kumar, Suresh Patil, Ananya Reddy, Resl Admin, Sirisha, Anil, Front office) — OK to use `<slug>@local.visiguard`, or do you have a real email list you want me to use?