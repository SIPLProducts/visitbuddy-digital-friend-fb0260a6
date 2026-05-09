# Fix: supabase-edge-functions container is not running

## What the diagnostic actually showed

- Host DNS works (resolves smtp.gmail.com, api.twilio.com)
- Outbound 53/443/587 all reachable
- UFW is fine for outbound
- **`supabase-edge-functions` container exists but is NOT running** — `Error response from daemon: container ... is not running`

So the "name resolution failed" response from the app is misleading. Kong is returning that because the upstream (edge-functions) is down. We don't need a DNS fix — we need to find out why the container died and bring it back up.

## Plan

### 1. New script: `deploy/diagnose-edge-functions.sh` (read-only)

Print everything needed to know why the container exited:

- `docker ps -a --filter name=supabase-edge-functions` — current state, exit code, restart count
- `docker inspect supabase-edge-functions --format '{{.State.Status}} exit={{.State.ExitCode}} err={{.State.Error}} oom={{.State.OOMKilled}} startedAt={{.State.StartedAt}} finishedAt={{.State.FinishedAt}}'`
- `docker logs --tail=200 supabase-edge-functions` — actual crash reason (most likely missing env var, bad import map, or a function that fails to boot)
- `docker inspect supabase-edge-functions --format '{{json .Config.Env}}' | tr ',' '\n'` — confirm `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `TWILIO_*`, SMTP secrets are present
- `ls supabase/functions/` and a quick syntax sanity ls of `index.ts` files

### 2. New script: `deploy/restart-edge-functions.sh` (recover)

Safe re-run:
- `docker compose -f $COMPOSE_DIR/docker-compose.yml up -d functions` (service name in supabase compose is `functions`)
- Wait up to 30s polling `docker inspect -f '{{.State.Running}}' supabase-edge-functions`
- If still not running: print last 100 lines of logs and exit non-zero
- If running: hit `http://localhost:8000/functions/v1/test-smtp` (Kong) with a HEAD/POST and confirm non-503

### 3. Likely root causes the script will surface (and the matching fix)

| Symptom in `docker logs supabase-edge-functions` | Cause | Fix |
|---|---|---|
| `BootError: Worker boot error` referencing one function | One edge function has a syntax/import error | Identify function, fix or temporarily move its folder out |
| `Missing environment variable JWT_SECRET` / `SUPABASE_SERVICE_ROLE_KEY` | `.env` missing keys after recent edit | Re-add to `backend/supabase/docker/.env` and `docker compose up -d` |
| `Cannot find module ... import_map.json` | `import_map.json` path wrong | Restore from git or remove the per-function config |
| `OOMKilled: true` | Memory limit | Bump container memory in compose |
| Exit 137 right after start | Killed by host (likely OOM) | Same as above |
| `failed to bind 0.0.0.0:9000` | Port conflict | Free port / change |

### 4. README update

Add section `0g` to `deploy/README-troubleshooting.md` documenting:
- The misleading "name resolution failed" error can also mean the edge-functions container is down (not DNS).
- Run `deploy/diagnose-edge-functions.sh` first; only run `fix-edge-dns.sh` if DNS inside a *running* container fails.

## What I will NOT change

- No edits to actual edge function code (`send-email`, `send-whatsapp-badge`, etc.) — they work on Lovable Cloud already, and the container being down is an infra issue, not a code issue.
- No DNS changes (host DNS is healthy).
- No firewall changes.

## Recovery commands you'll run after I push

```bash
cd /home/vmsadm/resl/vvms/vvms_deploy/visitbuddy-digital-friend-fb0260a6
git pull
sudo bash deploy/diagnose-edge-functions.sh    # paste output if it still fails
sudo bash deploy/restart-edge-functions.sh
```

Then retry "Send Test Email" in the app.
