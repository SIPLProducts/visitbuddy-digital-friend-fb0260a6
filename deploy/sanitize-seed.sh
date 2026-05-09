#!/usr/bin/env bash
# sanitize-seed.sh — neutralize malformed INSERT rows in deploy/seed/*.sql
# so a fresh import can proceed.
#
# Background: an older deploy/generate-seed-files.sh piped pg_dump --inserts
# through `grep '^INSERT'`. When a text value contained a newline, pg_dump
# legitimately wraps the value across multiple lines — `grep` kept the first
# line and silently dropped the rest. Result: an unterminated string literal
# followed by the next INSERT, which makes psql fail with errors like
#   "trailing junk after numeric literal at or near 1b"
# at the row immediately AFTER the broken one.
#
# We can't reconstruct the lost columns, so this script comments out any
# INSERT line that doesn't end with `);`. Idempotent — already-clean files
# pass through unchanged.
#
# Usage:
#   sudo bash deploy/sanitize-seed.sh
set -euo pipefail

if grep -q $'\r' "$0" 2>/dev/null; then
  sed -i 's/\r$//' "$0" 2>/dev/null || true
  exec bash "$0" "$@"
fi

HERE="$(cd "$(dirname "$0")" && pwd)"
SEED_DIR="$HERE/seed"

if [ ! -d "$SEED_DIR" ]; then
  echo "ERROR: $SEED_DIR not found" >&2
  exit 1
fi

TOTAL_DROPPED=0
for f in "$SEED_DIR"/*.sql; do
  [ -f "$f" ] || continue
  dropped=$(python3 - "$f" <<'PY'
import sys
path = sys.argv[1]
with open(path, 'r', encoding='utf-8', errors='replace') as fh:
    lines = fh.readlines()

# A statement that starts with INSERT must terminate with ");" before the
# next top-level statement begins. If a NEW statement keyword appears
# before the previous INSERT terminates, the previous one was truncated
# (by the legacy `grep '^INSERT'` filter that dropped continuation lines).
# Comment out only the truncated buffer; keep everything else intact —
# including legitimate multi-line INSERTs that DO eventually terminate.
TOP_KEYWORDS = ('INSERT ', 'BEGIN', 'COMMIT', 'TRUNCATE ', 'SELECT ',
                'UPDATE ', 'DELETE ', 'ALTER ', 'CREATE ', 'DROP ', 'SET ')

def is_top_stmt(line):
    return any(line.startswith(k) for k in TOP_KEYWORDS)

def terminates(buf):
    # buf is a list of lines forming an INSERT statement.
    last = ''.join(buf).rstrip()
    return last.endswith(');') or last.endswith(';')

out = []
dropped = 0
i = 0
while i < len(lines):
    line = lines[i]
    if line.startswith('INSERT '):
        # Buffer until terminator or next top-level statement.
        buf = [line]
        j = i + 1
        while j < len(lines):
            nxt = lines[j]
            if terminates(buf):
                break
            if is_top_stmt(nxt):
                # Truncated! Don't consume nxt — let outer loop reprocess it.
                break
            buf.append(nxt)
            j += 1
        if terminates(buf):
            out.extend(buf)
        else:
            out.append('-- [sanitize-seed] dropped malformed row (truncated by old grep filter):\n')
            for b in buf:
                out.append('-- ' + b if not b.startswith('--') else b)
            dropped += 1
        i = j
        continue
    out.append(line)
    i += 1

if dropped:
    with open(path, 'w', encoding='utf-8') as fh:
        fh.writelines(out)
print(dropped)
PY
)
  if [ "${dropped:-0}" -gt 0 ]; then
    printf '  %-40s dropped %s malformed row(s)\n' "$(basename "$f")" "$dropped"
    TOTAL_DROPPED=$((TOTAL_DROPPED + dropped))
  fi
done

echo
if [ "$TOTAL_DROPPED" -eq 0 ]; then
  echo "All seed files are clean. Nothing to sanitize."
else
  echo "Sanitized $TOTAL_DROPPED malformed row(s) across deploy/seed/*.sql."
  echo "Lost rows are preserved as comments (search for '[sanitize-seed]')."
fi