## Confirmed cause

The login failure is not frontend-related. Your server log shows the exact backend auth error:

```text
sql: Scan error on column index 3, name "confirmation_token": converting NULL to string is unsupported
```

The seeded `auth.users` rows were inserted without token columns such as `confirmation_token`, so they defaulted to `NULL`. The auth service expects string values and crashes during password login.

## Immediate server fix

Add a repair script `deploy/repair-auth.sh` that:

1. Loads the existing on-prem config.
2. Connects only through `docker exec supabase-db`.
3. Updates existing auth users by replacing nullable token fields with empty strings:
   ```sql
   UPDATE auth.users
   SET confirmation_token = COALESCE(confirmation_token, ''),
       recovery_token = COALESCE(recovery_token, ''),
       email_change_token_new = COALESCE(email_change_token_new, ''),
       email_change = COALESCE(email_change, ''),
       aud = COALESCE(NULLIF(aud, ''), 'authenticated'),
       role = COALESCE(NULLIF(role, ''), 'authenticated'),
       raw_app_meta_data = COALESCE(raw_app_meta_data, '{"provider":"email","providers":["email"]}'::jsonb),
       raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb);
   ```
4. Re-applies expected auth schema privileges for `supabase_auth_admin`.
5. Restarts `supabase-auth`.
6. Prints the health endpoint result and a login retry instruction.

## Permanent fix

Update the seed/import flow so this does not happen again:

1. Harden `deploy/seed/00_auth_users_bootstrap.sql` so all bootstrap users are repaired at the end of the file after insert.
2. Add the same auth-user normalization block to `deploy/import-seed.sh` immediately after applying `00_auth_users_bootstrap.sql`.
3. Fix `deploy/generate-seed-files.sh` auth export to stop using `grep '^INSERT'` for `auth.users`, because that can truncate multi-line auth rows the same way it previously damaged visitor seed rows.
4. Document the issue in `deploy/README-troubleshooting.md` as:
   ```text
   0e. Login returns {"code":"unexpected_failure","message":"Database error querying schema"}
   ```

## Recovery command after implementation

```bash
cd /home/vmsadm/resl/vvms/vvms_deploy/visitbuddy-digital-friend-fb0260a6
git pull
sudo bash deploy/repair-auth.sh
```

No wipe and no seed re-import needed.