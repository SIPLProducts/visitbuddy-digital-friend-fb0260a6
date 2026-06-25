#!/usr/bin/env bash
# Install the daily "send-pending-approval-reminders" cron job on the on-prem
# Supabase Postgres so future-dated visitor approvals trigger the host email
# in the morning of the visit date (06:00 IST = 00:30 UTC).
#
# Usage:  ./deploy/install-reminder-cron.sh
# Requires: deploy/.env with SUPABASE_URL, SUPABASE_ANON_KEY, and DATABASE_URL
# (or PGHOST/PGUSER/PGPASSWORD/PGDATABASE) so psql can connect as a superuser.
#
# Idempotent: safe to re-run; replaces any existing job with the same name.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  set -a; source "${ENV_FILE}"; set +a
fi

: "${SUPABASE_URL:?SUPABASE_URL must be set (in deploy/.env or environment)}"
: "${SUPABASE_ANON_KEY:?SUPABASE_ANON_KEY must be set (in deploy/.env or environment)}"

JOB_NAME="send-pending-approval-reminders-daily"
# 06:00 IST == 00:30 UTC, every day
SCHEDULE="30 0 * * *"
ENDPOINT="${SUPABASE_URL%/}/functions/v1/send-pending-approval-reminders"

echo "Installing pg_cron job '${JOB_NAME}'"
echo "  schedule : ${SCHEDULE}  (06:00 IST)"
echo "  endpoint : ${ENDPOINT}"

PSQL_CMD=(psql -v ON_ERROR_STOP=1)
if [[ -n "${DATABASE_URL:-}" ]]; then
  PSQL_CMD+=("${DATABASE_URL}")
fi

"${PSQL_CMD[@]}" <<SQL
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any prior schedule with the same name so this script is idempotent.
DO \$do\$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = '${JOB_NAME}';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
    RAISE NOTICE 'Unscheduled existing job % (id=%)', '${JOB_NAME}', v_jobid;
  END IF;
END
\$do\$;

SELECT cron.schedule(
  '${JOB_NAME}',
  '${SCHEDULE}',
  \$cron\$
    SELECT net.http_post(
      url     := '${ENDPOINT}',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ${SUPABASE_ANON_KEY}',
        'apikey',        '${SUPABASE_ANON_KEY}'
      ),
      body    := '{}'::jsonb
    );
  \$cron\$
);

SELECT jobid, jobname, schedule, active
FROM   cron.job
WHERE  jobname = '${JOB_NAME}';
SQL

echo "Done. Verify firing with:  ./deploy/diagnose-reminder-cron.sh"