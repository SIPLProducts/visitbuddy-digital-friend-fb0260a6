#!/usr/bin/env bash
# Diagnose the on-prem pre-schedule host approval reminder pipeline.
# Runs every check end-to-end and writes a copy to /tmp/reminder-diagnose.log
# so it can be shared back for support.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  set -a; source "${ENV_FILE}"; set +a
fi

JOB_NAME="send-pending-approval-reminders-daily"
EXPECTED_SCHEDULE="30 0 * * *"   # 06:00 IST == 00:30 UTC
LOG_FILE="/tmp/reminder-diagnose.log"

PSQL_CMD=(psql -v ON_ERROR_STOP=1)
if [[ -n "${DATABASE_URL:-}" ]]; then
  PSQL_CMD+=("${DATABASE_URL}")
fi

# Mirror all output to a log file for easy sharing
exec > >(tee "${LOG_FILE}") 2>&1

echo "============================================================"
echo " Pre-schedule host reminder diagnostic"
echo " Run at  : $(date -u +'%Y-%m-%dT%H:%M:%SZ') (UTC)"
echo " IST date: $(TZ=Asia/Kolkata date +'%Y-%m-%d %H:%M:%S')"
echo " Log file: ${LOG_FILE}"
echo "============================================================"

echo
echo "=== 1. Required Postgres extensions ==="
"${PSQL_CMD[@]}" <<'SQL'
SELECT extname, extversion
FROM   pg_extension
WHERE  extname IN ('pg_cron','pg_net')
ORDER  BY extname;
SQL

echo
echo "=== 2. Cron job entry (expected schedule: ${EXPECTED_SCHEDULE} = 06:00 IST) ==="
"${PSQL_CMD[@]}" <<SQL
SELECT jobid,
       jobname,
       schedule,
       active,
       CASE WHEN schedule = '${EXPECTED_SCHEDULE}'
            THEN 'OK'
            ELSE 'MISMATCH — re-run ./install-reminder-cron.sh'
       END AS schedule_check,
       LEFT(command, 200) AS command_preview
FROM   cron.job
WHERE  jobname = '${JOB_NAME}';
SQL

echo
echo "=== 3. Last 20 cron runs ==="
"${PSQL_CMD[@]}" <<SQL
SELECT r.runid,
       r.status,
       r.start_time AT TIME ZONE 'Asia/Kolkata' AS start_ist,
       r.end_time   AT TIME ZONE 'Asia/Kolkata' AS end_ist,
       LEFT(COALESCE(r.return_message, ''), 200) AS return_message
FROM   cron.job_run_details r
JOIN   cron.job j ON j.jobid = r.jobid
WHERE  j.jobname = '${JOB_NAME}'
ORDER  BY r.start_time DESC
LIMIT  20;
SQL

echo
echo "=== 4. Last 20 HTTP responses from net (pg_net) ==="
"${PSQL_CMD[@]}" <<'SQL'
SELECT id,
       status_code,
       LEFT(COALESCE(content, ''), 300) AS content_preview,
       error_msg,
       created
FROM   net._http_response
ORDER  BY id DESC
LIMIT  20;
SQL

echo
echo "=== 5. Today's pending visitors (IST) that should be reminded ==="
"${PSQL_CMD[@]}" <<'SQL'
WITH today_ist AS (
  SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date AS d
)
SELECT v.id,
       v.visitor_id,
       v.name,
       v.scheduled_date,
       v.status,
       v.host_id,
       e.name  AS host_name,
       e.email AS host_email,
       e.phone AS host_phone
FROM   public.visitors v
LEFT   JOIN public.employees e ON e.id = v.host_id
WHERE  v.status = 'pending_approval'
  AND  v.scheduled_date = (SELECT d FROM today_ist)
ORDER  BY v.created_at DESC
LIMIT  50;
SQL

echo
echo "=== 6. Manual fire of the reminder endpoint ==="
if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_ANON_KEY:-}" ]]; then
  echo "SKIPPED — SUPABASE_URL / SUPABASE_ANON_KEY missing in deploy/.env"
else
  ENDPOINT="${SUPABASE_URL%/}/functions/v1/send-pending-approval-reminders"
  echo "POST ${ENDPOINT}"
  HTTP_CODE=$(curl -sS -o /tmp/reminder-fire.json -w '%{http_code}' \
    -X POST \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d '{}' \
    "${ENDPOINT}" || echo "000")
  echo "HTTP ${HTTP_CODE}"
  echo "--- body ---"
  cat /tmp/reminder-fire.json 2>/dev/null || true
  echo
fi

echo
echo "============================================================"
echo " Done. Share ${LOG_FILE} if anything above looks red."
echo "============================================================"