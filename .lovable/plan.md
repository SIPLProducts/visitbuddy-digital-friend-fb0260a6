## Goal

Make the on-premises deployment carry over **every credential** (Gemini, SMTP, Twilio, WhatsApp bridge, etc.) **and all existing data** (database rows + storage files) from the current Lovable Cloud project, so the self-hosted server runs identically from day one.

---

## Part A — Credentials / Secrets

Today `deploy/deploy.sh` only prompts for a few values. We will extend it to collect, persist, and inject **every secret the edge functions read at runtime**.

### Secrets to collect (matches current cloud project)

| Secret | Used by | Default |
|---|---|---|
| `GEMINI_API_KEY` | `anpr-scan` (self-hosted path already supports it) | required for ANPR |
| `LOVABLE_API_KEY` | `anpr-scan` (optional fallback) | blank on-prem |
| `TWILIO_ACCOUNT_SID` | `notify-host`, `send-*-badge`, `send-vehicle-whatsapp` | required |
| `TWILIO_AUTH_TOKEN` | same | required |
| `TWILIO_WHATSAPP_NUMBER` | WhatsApp badges | required |
| `TWILIO_SMS_NUMBER` | SMS badges | required |
| `RESEND_API_KEY` | `send-email`, `send-email-badge` | optional (SMTP path preferred on-prem) |
| `WHATSAPP_BRIDGE_URL` | `whatsapp-bridge` proxy | already prompted |
| `WHATSAPP_BRIDGE_API_KEY` | bridge auth | already prompted |
| `SMTP_*` (host/port/user/pass/from) | `send-email`, `test-smtp` | required for email |

SMTP host/user/password are also stored in the `email_config` table per existing app behaviour, so the deploy script will both write them to env and let the admin set them via Settings.

### Implementation

1. **`deploy/deploy.sh`** — add a "Step 5: Application credentials" section that:
   - Prompts (with `read -s` for secrets, allows blank to skip optional ones).
   - Writes them to `/home/vmsadm/resl/vvms/config.env` (chmod 600, owner `vmsadm`).
   - Appends them to `backend/supabase/docker/volumes/functions/.env` (the file all edge functions read).
   - Restarts `functions` container so values take effect.
2. **`deploy/update.sh`** — re-source `config.env` and re-render the functions `.env` on every update so values are never lost.
3. **Idempotency** — if a value already exists in `config.env`, prompt shows it as default `[****]` and keeps it on Enter.

---

## Part B — Data migration (DB + storage)

Bring the live Lovable Cloud data to the on-prem Postgres + storage volume.

### One-time export (run before cutover, from any machine with `psql`/`pg_dump`)

A new helper script **`deploy/export-from-cloud.sh`** that:

1. Takes `SUPABASE_DB_URL` (cloud) + `SUPABASE_URL` + service-role key as inputs.
2. Runs:
   ```
   pg_dump --no-owner --no-privileges \
     --schema=public --schema=auth --schema=storage \
     --format=custom --file cloud-export.dump "$SUPABASE_DB_URL"
   ```
3. Mirrors storage buckets (`visitor-photos`, `branding`) to a local folder using the Supabase Storage REST API (loop: list objects → download to `storage-export/<bucket>/<path>`).
4. Outputs two artifacts:
   - `cloud-export.dump` (Postgres custom-format dump)
   - `storage-export.tgz` (tarball of bucket files)

### One-time import on the on-prem server

A new helper **`deploy/import-to-onprem.sh`** that:

1. Stops `functions` and frontend Nginx briefly.
2. Restores DB:
   ```
   pg_restore --clean --if-exists --no-owner --no-privileges \
     --dbname="postgresql://postgres:$POSTGRES_PASSWORD@127.0.0.1:5432/postgres" \
     cloud-export.dump
   ```
3. Re-creates the two storage buckets locally (idempotent SQL).
4. Untars `storage-export.tgz` into `backend/supabase/docker/volumes/storage/` so the self-hosted Storage API serves the same files at the same paths.
5. Re-runs `deploy/init-schema.sql` only for tables not present in the dump (safety no-op since dump already has schema).
6. Runs `ANALYZE` and prints row counts per major table for verification.

### Post-import notes

- `auth.users` is included → existing logins (incl. `bala@sharviinfotech.com`) keep working with the same passwords.
- `user_location_roles`, `profiles`, all visitor/vehicle history preserved.
- Photo URLs stay valid because bucket names + object paths are preserved.

---

## Part C — Documentation (v5 guide)

Regenerate `VisiGuard-Deployment-Guide-v5.docx` adding:

- **§5 Credentials** — table of every secret, where to obtain it (Twilio console, Google AI Studio for Gemini, SMTP provider), and how to rotate later (`vim config.env` → `docker compose restart functions`).
- **§6 Data Migration from Lovable Cloud** — two-step procedure (export → import) with exact commands, expected duration, and a verification checklist (row counts, sample login, photo loads).
- **§7 Backup & Restore** — already covered, cross-reference `backup.sh` now also dumps the same data the importer expects, so on-prem → on-prem migration uses the same tooling.

---

## Out of scope

- No app/UI code changes.
- No edge function logic changes (Gemini fallback already exists in `anpr-scan`).
- No automated continuous sync between cloud and on-prem — this is a one-time cutover.
