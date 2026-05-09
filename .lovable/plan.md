## Plan

Fix the installer so the current VisiGuard stack owns `127.0.0.1:5432` and old/system Postgres cannot keep blocking it.

### 1. Harden the preflight wipe
- Update `deploy/wipe-postgres.sh` to also stop/remove containers publishing `5432`, not only containers named `supabase-*`.
- Purge conflicting apt packages more reliably, including `postgresql-client-common` cleanup only when safe.
- Add a final diagnostic that shows exactly what still owns `5432` if the wipe cannot free it.

### 2. Prevent Supabase pooler from taking the same port
- Update the compose patching in `deploy/deploy.sh` so only the real database service publishes host `127.0.0.1:5432`.
- Remove/replace any Supabase pooler host mapping that tries to bind `127.0.0.1:5432`.
- Keep pooler internal for Docker services, or move its host binding to another non-conflicting port if the upstream compose file requires it.

### 3. Add a deploy-time guard before `docker compose up`
- Right before starting the stack, check whether `5432` is already in use.
- If it is used by system Postgres or an old container, stop/remove it automatically.
- If another unrelated process owns it, fail with a clear command output so the admin knows what to remove.

### 4. Update recovery instructions
- Add the immediate server commands to `deploy/README-troubleshooting.md`:
  - stop current broken compose stack
  - run `deploy/wipe-postgres.sh --force`
  - remove the half-created backend if needed
  - rerun `sudo bash install.sh --force-wipe --with-seed`

### Technical note
The current error says `supabase-pooler` is trying to bind `127.0.0.1:5432`. That means the default upstream compose file already exposes the pooler on host `5432`, while our script also wants Postgres on host `5432`. The fix should make that idempotent: database gets `5432`, pooler does not.