## Goal

Allow VisiGuard to be deployed and accessed over a **public IP + ports** (no domain, no Let's Encrypt) on the on-prem server, while keeping the existing domain-based flow as an option.

## Access model (IP mode)

Single public IP, three services on distinct ports — all plain HTTP (or self-signed HTTPS if requested):

```
http://<PUBLIC_IP>            -> Frontend (Nginx, port 80)
http://<PUBLIC_IP>:8000       -> Supabase API + Studio
http://<PUBLIC_IP>:3001       -> WhatsApp bridge (optional, can stay localhost-only)
```

Edge functions still talk to the WhatsApp bridge over the Docker bridge (`http://host.docker.internal:3001`) — unchanged.

## Changes

### 1. `deploy/deploy.sh`
- Add a new prompt at the top: `DEPLOY_MODE` = `ip` | `domain` (default `ip` when no domain entered).
- When `DEPLOY_MODE=ip`:
  - Prompt for `PUBLIC_IP` (auto-detect via `curl -s https://api.ipify.org` as default).
  - Skip the `APP_DOMAIN` / `API_DOMAIN` / `WA_DOMAIN` prompts; derive:
    - `APP_URL=http://<IP>`
    - `API_URL=http://<IP>:8000`
    - `WA_URL=http://<IP>:3001` (optional)
  - Write frontend `.env.production` with `VITE_SUPABASE_URL=$API_URL`.
  - Configure Supabase `.env` with `SITE_URL`, `API_EXTERNAL_URL`, `SUPABASE_PUBLIC_URL`, `ADDITIONAL_REDIRECT_URLS` set to the IP URLs.
  - Bind Supabase Kong port `8000` and Studio to `0.0.0.0` (currently only exposed inside Docker). Add UFW rules: `ufw allow 8000/tcp`, optionally `ufw allow 3001/tcp`.
  - Install only the **frontend** Nginx vhost as a `default_server` (no `server_name`) so it answers on the bare IP.
  - **Skip** the `supabase-api` and `whatsapp` Nginx vhosts (Supabase/WA are reached directly on their published ports).
  - **Skip** the `certbot` step entirely; print a notice that HTTPS is disabled.
- When `DEPLOY_MODE=domain`: existing flow unchanged.
- Persist `DEPLOY_MODE` and `PUBLIC_IP` in `config.env` so re-runs are idempotent.

### 2. `deploy/nginx/frontend.conf.tpl`
- Add an alternate IP-mode template (or branch in the existing one) that renders:
  ```
  server {
      listen 80 default_server;
      server_name _;
      root __ROOT__;
      ...
  }
  ```
- `deploy.sh` picks the right template based on `DEPLOY_MODE`.

### 3. Supabase `docker-compose.yml` exposure
- After cloning supabase/docker, `sed` the `kong` service port mapping from `127.0.0.1:8000:8000` (default in some templates) to `0.0.0.0:8000:8000` only in IP mode. If the upstream already exposes on `0.0.0.0`, no-op.

### 4. `deploy/README.md`
- Add an "IP-only deployment" section showing:
  - One-line install: `sudo DEPLOY_MODE=ip PUBLIC_IP=203.0.113.10 bash deploy/deploy.sh`
  - The 3 access URLs
  - Firewall ports to open (80, 8000, optional 3001)
  - Caveats: no HTTPS → camera/PWA features that require secure context (getUserMedia, service workers, push) will be **blocked by browsers** on plain HTTP. Workaround: use a self-signed cert (documented) or access via `http://localhost` from the same machine.

### 5. Deployment guide doc — regenerate as `VisiGuard-Deployment-Guide-v4.docx`
New section **§3 Choose Access Mode** with two subsections:
- **§3A Domain mode** (existing content)
- **§3B IP-only mode** — covers:
  - Required: static public IP, ports 80/8000 open in cloud firewall + UFW
  - Step-by-step install command with `DEPLOY_MODE=ip`
  - URL table (App / Supabase API + Studio / WhatsApp bridge)
  - Browser limitations on plain HTTP (camera, QR scanner, PWA install) + the two workarounds (self-signed HTTPS, or migrate to a domain later by re-running `deploy.sh` with `DEPLOY_MODE=domain`)
  - How to migrate IP → domain later (rerun installer; it rewrites Nginx, frontend env, and Supabase URLs)
- Update §4.5 (WhatsApp Bridge URL) to note that in IP mode the bridge stays at `http://host.docker.internal:3001` — the public `:3001` port is only for QR scanning from your laptop and can be left closed in production.
- Render to PDF, sweep every page with `pdftoppm` for QA.

## Out of scope
- Self-signed TLS automation (mentioned as a manual workaround only).
- Reverse-proxying Supabase through port 80 with path prefixes (more fragile; users who want one-port access should use a domain).
- Database, edge function, or app code changes.

## Deliverable
- Updated `deploy/deploy.sh`, `deploy/nginx/frontend.conf.tpl` (+ optional IP variant), `deploy/README.md`.
- New artifact: `VisiGuard-Deployment-Guide-v4.docx` at `/mnt/documents/`.
