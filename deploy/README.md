# VisiGuard — Self-Hosted Deployment

One-shot installer for Ubuntu 22.04 / 24.04. Everything lives under a single base directory (default `/home/vmsadm/resl/vvms`):

```
/home/vmsadm/resl/vvms/
├── frontend/      # Vite app source + built dist (Nginx serves dist/)
├── backend/       # Self-hosted Supabase (docker compose stack + edge functions)
│   └── supabase/
│       └── docker/
├── middleware/    # Integration services
│   ├── whatsapp-bridge/         # whatsapp-web.js container source
│   └── whatsapp-bridge-data/    # persisted WhatsApp session
├── backups/       # nightly pg_dump archives (14-day retention)
└── config.env     # all answers from deploy.sh (re-used on re-run)
```

## Server requirements

- Ubuntu 22.04 or 24.04 LTS, root/sudo access
- 4 vCPU / 8 GB RAM / 80 GB SSD (minimum)
- Either:
  - a **static public IP** with TCP ports 80 + 8000 open (and 3001 if you want remote QR scanning), **or**
  - **DNS A records** pointing to the server (recommended for production):
    - `visiguard.example.com`     → frontend
    - `api.visiguard.example.com` → Supabase API + Studio
    - `wa.visiguard.example.com`  → WhatsApp bridge

## Install — IP-only mode (no domain)

Use this when you don't yet have a domain and want to access the app over the
server's public IP. Plain HTTP, no Let's Encrypt.

```bash
ssh root@your-server
git clone <YOUR_REPO_URL> /tmp/visiguard-src
cd /tmp/visiguard-src
sudo DEPLOY_MODE=ip PUBLIC_IP=203.0.113.10 bash deploy/deploy.sh
```

After install:

| Service             | URL                              |
|---------------------|----------------------------------|
| App                 | `http://<PUBLIC_IP>`             |
| Supabase API/Studio | `http://<PUBLIC_IP>:8000`        |
| WhatsApp bridge     | `http://<PUBLIC_IP>:3001` (only if WA_PORT≠0) |

**HTTP-only caveats** — modern browsers disable a few capabilities on plain
HTTP from non-`localhost` origins:

- Camera capture (visitor photo, QR scanner) — blocked by `getUserMedia`.
- PWA install / service worker / push notifications — disabled.
- Clipboard write API — restricted.

Workarounds: (1) point a domain at the server and re-run with
`DEPLOY_MODE=domain` for free Let's Encrypt TLS, or (2) install a self-signed
cert manually in Nginx.

## Install — Domain mode (recommended for production)

```bash
ssh root@your-server
git clone <YOUR_REPO_URL> /tmp/visiguard-src
cd /tmp/visiguard-src
sudo DEPLOY_MODE=domain bash deploy/deploy.sh
```

The script creates the `vmsadm` user (if missing), installs Docker / Node 20 / Nginx / Certbot, brings up self-hosted Supabase, deploys edge functions, builds the WhatsApp bridge container, builds the frontend, configures Nginx + TLS, enables systemd auto-start, and schedules nightly backups.

To deploy under a different path or user, set env vars before running:

```bash
sudo SERVICE_USER=vmsadm BASE_DIR=/home/vmsadm/resl/vvms DEPLOY_MODE=domain bash deploy/deploy.sh
```

## After install

1. Open `https://wa.<domain>` and scan the WhatsApp QR (first run only).
2. Open `https://visiguard.<domain>` and log in as the admin email/password you provided.
3. Open `https://api.<domain>` for Supabase Studio (basic-auth credentials in `/home/vmsadm/resl/vvms/config.env`).

## Updates

```bash
# Pull latest code into /tmp/visiguard-src then:
sudo bash /tmp/visiguard-src/deploy/update.sh
```

This rsyncs source into `frontend/`, rebuilds, redeploys edge functions, and rebuilds the WhatsApp bridge container.

## Backups

Cron runs `/usr/local/bin/visiguard-backup` nightly at 02:00 → `/home/vmsadm/resl/vvms/backups/`.

```bash
# Manual restore
pg_restore --clean --if-exists --no-owner \
  -d "postgresql://postgres:$POSTGRES_PASSWORD@127.0.0.1:5432/postgres" \
  /home/vmsadm/resl/vvms/backups/db-YYYYMMDD-HHMMSS.dump
```

## Migrating data from Lovable Cloud (one-time)

```bash
# On a machine with Lovable Cloud DB access:
pg_dump --data-only --no-owner --schema=public "$LOVABLE_CLOUD_DB_URL" > visiguard-data.sql

# Storage objects
supabase storage cp -r ss://visitor-photos ./visitor-photos --project-ref <ref>
supabase storage cp -r ss://branding       ./branding       --project-ref <ref>

# Then on the new server:
psql "postgresql://postgres:$POSTGRES_PASSWORD@127.0.0.1:5432/postgres" -f visiguard-data.sql
# Re-upload storage via Studio or REST API.
```

## What's different vs Lovable Cloud

- **AI/ANPR**: Lovable AI Gateway is unavailable. `anpr-scan` falls back to Google Gemini directly using `GEMINI_API_KEY`.
- **Secrets**: managed via `/home/vmsadm/resl/vvms/config.env` and `backend/supabase/docker/volumes/functions/.env`. Edit either, then `update.sh` (or restart the `functions` service).
- **Auth providers** (Google OAuth, etc.): configure in Supabase Studio → Authentication.

## Troubleshooting

```bash
# Backend stack
docker compose -f /home/vmsadm/resl/vvms/backend/supabase/docker/docker-compose.yml ps
docker compose -f /home/vmsadm/resl/vvms/backend/supabase/docker/docker-compose.yml logs -f

# Middleware
docker logs -f wa-bridge

# Web
journalctl -u nginx
systemctl status visiguard-backend.service

# Re-run the installer at any time — it's idempotent
sudo bash /tmp/visiguard-src/deploy/deploy.sh
```
