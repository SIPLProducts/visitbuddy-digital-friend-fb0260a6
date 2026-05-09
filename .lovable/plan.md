## Root cause

The committed seed files `deploy/seed/00_auth_users_bootstrap.sql` (106 lines) and `deploy/seed/48_email_logs.sql` (3,382 lines) contain bare lines:

```
[sanitize-seed] dropped malformed row:
```

with no `--` prefix. These were injected by an earlier buggy version of `sanitize-seed.sh` and committed to the repo. The current sanitizer is now idempotent and won't touch them again, but the damage is permanent in those files. psql sees `[sanitize-seed]...` as raw SQL and fails immediately.

The actual INSERTs interleaved between those marker lines are valid and complete (each on its own line, ending in `;`).

## Plan

1. **Strip the bare markers from the two committed files** — every line that starts with `[sanitize-seed]` (no leading `--`) is garbage from the old buggy run. Remove them so the surrounding INSERTs stand alone.

   - `deploy/seed/00_auth_users_bootstrap.sql` — 106 lines to remove
   - `deploy/seed/48_email_logs.sql` — 3,382 lines to remove

2. **Harden `deploy/sanitize-seed.sh` to also self-heal this corruption** — at the start of each file, drop or comment out any line starting with `[sanitize-seed]` (bare, no `--`). This way any user who already pulled the corrupted files gets fixed automatically by `import-seed.sh` (which already invokes the sanitizer).

3. **Add a regression note in `deploy/README-troubleshooting.md`** under section `0d`: if you see `syntax error at or near "["` followed by `LINE 1: [sanitize-seed]...`, re-pull and re-run `import-seed.sh` (the sanitizer now strips them).

No other seed files are affected (verified — only `00_*` and `48_*` have bare markers).

## Server recovery

After approval the user runs:

```bash
cd /home/vmsadm/resl/vvms/vvms_deploy/visitbuddy-digital-friend-fb0260a6
git pull
sudo bash deploy/import-seed.sh
```

`import-seed.sh` already calls the sanitizer first, so the import will proceed cleanly.
