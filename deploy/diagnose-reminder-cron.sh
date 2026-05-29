#!/usr/bin/env bash
# Show the current state of the daily approval-reminder cron job and its
# most recent runs. Useful to confirm that morning host emails are firing.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  set -a; source "${ENV_FILE}"; set +a
fi

JOB_NAME="send-pending-approval-reminders-daily"

PSQL_CMD=(psql -v ON_ERROR_STOP=1)
if [[ -n "${DATABASE_URL:-}" ]]; then
  PSQL_CMD+=("${DATABASE_URL}")
fi

echo "=== cron.job entry for ${JOB_NAME} ==="
"${PSQL_CMD[@]}" <<SQL
SELECT jobid, jobname, schedule, active, LEFT(command, 120) AS command_preview
FROM   cron.job
WHERE  jobname = '${JOB_NAME}';
SQL

echo
echo "=== Last 10 runs ==="
"${PSQL_CMD[@]}" <<SQL
SELECT r.runid,
       r.status,
       r.start_time,
       r.end_time,
       LEFT(COALESCE(r.return_message, ''), 200) AS return_message
FROM   cron.job_run_details r
JOIN   cron.job j ON j.jobid = r.jobid
WHERE  j.jobname = '${JOB_NAME}'
ORDER  BY r.start_time DESC
LIMIT  10;
SQL