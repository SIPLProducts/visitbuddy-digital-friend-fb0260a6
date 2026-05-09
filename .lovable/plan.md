## Goals

1. **Stop building the WhatsApp bridge Docker image** on the server (the apt fetch from `deb.debian.org` keeps timing out behind your corporate firewall).
2. **Reuse the existing "external bridge URL" pattern** (same as ngrok today) — the edge function already reads `WHATSAPP_BRIDGE_URL` from env. We just point it at `http://<SERVER_IP>:<PORT>` (or any reachable URL) instead of `host.docker.internal`.
3. **Confirm `redeploy.sh --with-seed` pushes the committed cloud snapshot** into the self-hosted Postgres — yes it does, via `deploy/seed/*.sql`.

## Answer to your second question (no code needed)

**Yes.** Running:

```bash
sudo bash deploy/redeploy.sh --with-seed --keep-config
```

executes this exact pipeline:

```text
[1] docker compose down -v          → wipes old self-hosted DB + storage
[2] deploy.sh (SKIP_SCHEMA=1)        → boots empty Supabase stack
[3] apply-migrations.sh              → runs every supabase/migrations/*.sql
[4] import-seed.sh                   → loads deploy/seed/*.sql in order:
       00_auth_users → 10_locations → 11_screens → 12_tenant_settings →
       13_email_templates → 14_email_config → 15_vehicle_types →
       16_profiles → 17_user_location_roles → 18_role_screen_permissions →
       19_departments → 20_employees → 21_gates →
       41_accompanying_visitors → 42_visitor_agreements → 43_visitor_watchlist →
       44_vehicles → 45_vehicle_entries → 46_appointments → 47_audit_logs
[5] repair-postgrest.sh + REST 200 health check
```

Cloud data lands in self-hosted Postgres. Visitor photos come over only if you pass `--storage <storage-export.tgz>`.

The one caveat already in `import-seed.sh`: if `deploy/seed/00_auth_users.sql` is empty, profiles + roles get skipped (auth.users FK would fail). That file is generated from cloud and should already be committed.

## Plan for the WhatsApp bridge — adopt the ngrok pattern

### Current behaviour (broken)
`deploy.sh` always tries to `docker build` the bridge image locally → fails on apt because the docker build network can't reach Debian mirrors.

### New behaviour
Treat the bridge **exactly like the ngrok setup**: it lives outside the deploy pipeline, exposed via a URL, and the edge function calls it. Default that URL to **`http://<PUBLIC_IP>:3001`** (the current server's IP and the WA bridge port we already auto-pick) so it works out of the box without changing anything else.

### Files to change

**1. `deploy/deploy.sh`** — make the bridge build optional and pluggable:
- Add a new prompt during config: `WhatsApp bridge URL [http://<PUBLIC_IP>:3001]:` (replaces today's `http://host.docker.internal:3001`).
- Add `BUILD_WA_BRIDGE` flag (default `0` now). Skip the entire `docker build` + `docker run wa-bridge` section unless explicitly enabled with `BUILD_WA_BRIDGE=1`.
- Always write the chosen URL into the Supabase `.env` as `WHATSAPP_BRIDGE_URL=` so the `whatsapp-bridge` edge function picks it up.
- Print a clear post-install hint:
  ```
  WhatsApp bridge: external mode
    URL configured: http://10.100.4.36:3001
    To run a bridge: bash deploy/run-wa-bridge.sh   (host network, no Docker apt)
    Or point WHATSAPP_BRIDGE_URL at any reachable endpoint (ngrok, another VM, etc.)
  ```

**2. `deploy/redeploy.sh`** — surface the same flag:
- New flag `--build-wa` → exports `BUILD_WA_BRIDGE=1`.
- Default behaviour: skip the bridge build, deploy completes cleanly even with no internet to deb.debian.org.

**3. `deploy/run-wa-bridge.sh` (new)** — one-shot helper for when you DO want a local bridge:
- Uses `docker build --network=host` (bypasses the broken bridge network that caused tonight's failure).
- Runs container with `-p 0.0.0.0:3001:3000` so it's reachable at `http://<SERVER_IP>:3001`.
- Reads `WHATSAPP_BRIDGE_API_KEY` from `config.env`.
- Idempotent: `docker rm -f wa-bridge` first.

**4. `whatsapp-bridge/Dockerfile`** — make it actually build when you do run it:
- `FROM node:20-bullseye-slim` → `FROM node:20-bookworm-slim` (bookworm mirrors are alive; bullseye is being EOLed).
- `libasound2` → `libasound2t64` (renamed in bookworm).
- Everything else identical.

**5. `deploy/README.md`** — short section explaining the new model:
- Default = external bridge URL (same as ngrok today, just pointing at server IP).
- Optional = `bash deploy/run-wa-bridge.sh` to spin one up locally.
- Optional = full Docker-built bridge inside the stack via `--build-wa` (only if your network can reach deb.debian.org).

### Why this matches your request
- Same mental model as ngrok: a URL configured once, edge function calls it.
- The URL defaults to **the current server IP** (auto-detected by `deploy.sh`'s existing `PUBLIC_IP` prompt), exactly as you asked.
- Tonight's apt-mirror failure can never block a redeploy again — bridge build is now opt-in.

## On-server unblock right now (no waiting for these patches)

```bash
cd /home/vmsadm/resl/vvms/vvms_deploy/visitbuddy-digital-friend-fb0260a6
# Tell deploy.sh there is no bridge to build — it'll just write the URL into env.
sudo SKIP_WA_BRIDGE=1 bash deploy/redeploy.sh --with-seed --keep-config
```

(`SKIP_WA_BRIDGE=1` will be honoured once the patch in step 1 above lands; until then the manual workaround is to comment out the `docker build` block in `deploy.sh` lines around the wa-bridge section, or pre-build the image with `docker build --network=host` from `whatsapp-bridge/`.)

## Summary of what gets created/edited

- **edited** `deploy/deploy.sh` — prompt for bridge URL defaulting to server IP, skip docker build by default, always write `WHATSAPP_BRIDGE_URL` into Supabase `.env`
- **edited** `deploy/redeploy.sh` — `--build-wa` flag wiring
- **new**    `deploy/run-wa-bridge.sh` — opt-in local bridge runner using `--network=host`
- **edited** `whatsapp-bridge/Dockerfile` — bookworm + libasound2t64 fix
- **edited** `deploy/README.md` — document the three modes (external URL / local helper / full Docker build)
- No changes to migrations, seed files, or the edge function — they already work with whatever URL you set.
