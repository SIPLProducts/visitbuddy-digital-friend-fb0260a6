## Fix duplicate `ports:` key in Supabase compose file

### Root cause
`deploy/deploy.sh` patches the Supabase `docker-compose.yml` to publish Postgres on host `5432`. The current Python regex is non-greedy and only captures the first lines under `  db:`, so the existing `ports:` stanza further down in the db service is invisible to the check — a second `ports:` block gets appended → YAML duplicate key error.

The compose file already on disk at `/home/vmsadm/resl/vvms/backend/supabase/docker/docker-compose.yml` is now corrupted, and `deploy.sh` doesn't re-clone the Supabase repo on each run, so the next run will hit the same broken file.

### Changes

**1. `deploy/deploy.sh` — replace the fragile patcher (lines ~287–308)**

Use a YAML-aware approach with PyYAML (already available with python3 on Ubuntu via `python3-yaml`, install if missing). Idempotent and safe:

```bash
POSTGRES_HOST_PORT="${POSTGRES_HOST_PORT:-5432}"
python3 - "$COMPOSE_FILE" "$POSTGRES_HOST_PORT" <<'PY'
import sys, yaml
path, port = sys.argv[1], sys.argv[2]
with open(path) as f:
    doc = yaml.safe_load(f)
db = doc.get('services', {}).get('db', {})
mapping = f"127.0.0.1:{port}:5432"
ports = db.get('ports') or []
# Strip any prior 5432 mapping to avoid duplicates
ports = [p for p in ports if not str(p).endswith(':5432')]
ports.append(mapping)
db['ports'] = ports
doc['services']['db'] = db
with open(path, 'w') as f:
    yaml.safe_dump(doc, f, sort_keys=False)
PY
```

Add a one-line apt fallback above it:
```bash
python3 -c 'import yaml' 2>/dev/null || sudo apt-get install -y python3-yaml
```

**2. `deploy/deploy.sh` — re-clone Supabase compose on every run (or self-repair)**

Add right before the patch step:
```bash
# Always start from a pristine compose file so re-runs cannot accumulate damage.
if [ -d "$SUPA_DOCKER" ] && [ ! -f "$SUPA_DOCKER/docker-compose.yml.orig" ]; then
  cp "$SUPA_DOCKER/docker-compose.yml" "$SUPA_DOCKER/docker-compose.yml.orig"
fi
if [ -f "$SUPA_DOCKER/docker-compose.yml.orig" ]; then
  cp "$SUPA_DOCKER/docker-compose.yml.orig" "$SUPA_DOCKER/docker-compose.yml"
fi
```
Then re-run the API_PORT/KONG sed and the new ports patcher against the fresh file.

**3. Immediate manual recovery for the user**

Document in `README-troubleshooting.md` (and tell user in chat) the one-time fix:
```bash
cd /home/vmsadm/resl/vvms/backend/supabase/docker
docker compose down -v 2>/dev/null || true
cd /home/vmsadm/resl/vvms
sudo rm -rf backend
cd /home/vmsadm/resl/vvms/vvms_deploy/visitbuddy-digital-friend-fb0260a6
sudo bash install.sh --with-seed
```

### Testing checklist
- [ ] Fresh run: patched compose has exactly one `ports:` under db, mapping `127.0.0.1:5432:5432`
- [ ] Re-run on same host: still exactly one mapping (idempotent)
- [ ] `docker compose -f .../docker-compose.yml config` exits 0
- [ ] Stack boots; `psql_exec -c 'select 1'` succeeds inside container
