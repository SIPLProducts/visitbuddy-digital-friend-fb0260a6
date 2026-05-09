## Problem

`deploy.sh` writes the persisted env to **`$BASE_DIR/config.env`** (i.e. `/home/vmsadm/resl/vvms/config.env`).

But `apply-migrations.sh` and `import-seed.sh` only look at **`$HERE/config.env`** (i.e. `deploy/config.env` inside the repo checkout) — which doesn't exist. So `POSTGRES_PASSWORD` is unset and the script aborts before any migrations or seed data run. That's why Studio shows empty tables.

`redeploy.sh` itself does `source "$ENV_FILE"` from the right path, so it works — the bug is only in the two child scripts it shells out to.

## Fix

Update both scripts to source from `$BASE_DIR/config.env` (with `$HERE/config.env` as fallback for backward compatibility).

### Files to change

**`deploy/apply-migrations.sh`** — replace the config-loading block:
```bash
SERVICE_USER="${SERVICE_USER:-vmsadm}"
BASE_DIR="${BASE_DIR:-/home/${SERVICE_USER}/resl/vvms}"
for CFG in "$BASE_DIR/config.env" "$HERE/config.env"; do
  if [ -f "$CFG" ]; then
    # shellcheck disable=SC1090
    . "$CFG"
    break
  fi
done
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD not set (run deploy.sh first)}"
```

**`deploy/import-seed.sh`** — same change in its config-loading block.

That's it. After the patch, re-run:
```bash
sudo bash deploy/redeploy.sh --with-seed --keep-config
```
and migrations + seed (locations, gates, employees, vehicles, etc.) will populate the self-hosted Studio tables.

## Why your manual `source /home/vmsadm/resl/vvms/config.env` didn't help

That only sets the variables in your **interactive shell**. When `redeploy.sh` runs `bash apply-migrations.sh`, it spawns a new bash process which doesn't inherit unexported variables. The fix above makes the child script load the file itself.

## Workaround (if you don't want to wait for the patch)

You can re-run the two child scripts directly from the shell where you already sourced the config — no full redeploy needed:

```bash
source /home/vmsadm/resl/vvms/config.env
sudo -E bash deploy/apply-migrations.sh
sudo -E bash deploy/import-seed.sh
sudo -E bash deploy/repair-postgrest.sh
```

The `-E` preserves your environment so the child sees `POSTGRES_PASSWORD`. After this Studio tables should be populated.

Approve to apply the permanent fix.