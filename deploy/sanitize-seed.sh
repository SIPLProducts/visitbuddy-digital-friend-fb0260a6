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
import sys, os, re
path = sys.argv[1]
with open(path, 'r', encoding='utf-8', errors='replace') as fh:
    lines = fh.readlines()

# Identify INSERT lines that don't terminate with ");" (with optional
# trailing whitespace). Those are rows truncated by the old grep filter.
out = []
dropped = 0
i = 0
while i < len(lines):
    line = lines[i]
    if line.startswith('INSERT '):
        stripped = line.rstrip('\n').rstrip()
        if not stripped.endswith(');'):
            # Broken row — comment it out so psql ignores it. Also comment
            # any subsequent non-statement lines (defensive; usually none
            # because grep already dropped them, but handles the case where
            # a future generator leaves trailing bits).
            out.append('-- [sanitize-seed] dropped malformed row:\n')
            out.append('-- ' + line)
            dropped += 1
            i += 1
            while i < len(lines):
                nxt = lines[i]
                if nxt.startswith(('INSERT ', 'BEGIN', 'COMMIT', 'TRUNCATE',
                                   'SELECT ', '--', '\n')):
                    break
                out.append('-- ' + nxt)
                i += 1
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