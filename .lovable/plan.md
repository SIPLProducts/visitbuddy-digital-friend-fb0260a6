## Goal

Move the default deployment base directory from `/home/vmsadm/resl` to `/home/vmsadm/resl/vvms` so frontend, backend, middleware, backups and config all live under one project-named folder.

## Resulting layout

```text
/home/vmsadm/resl/vvms/
├── frontend/      # Vite source + dist (Nginx web root)
├── backend/       # Self-hosted Supabase (docker stack + edge functions)
│   └── supabase/docker/
├── middleware/
│   ├── whatsapp-bridge/
│   └── whatsapp-bridge-data/
├── backups/       # nightly pg_dump + storage + WA session
└── config.env     # all installer answers (mode 600)
```

`SERVICE_USER` stays `vmsadm`. Override is still supported via env vars on the installer.

## Code changes

1. `deploy/deploy.sh` — change `BASE_DIR` default to `/home/vmsadm/resl/vvms`; ensure `mkdir -p` covers the new parent; keep all sub-path derivations (`FRONTEND_DIR`, `BACKEND_DIR`, etc.) as-is since they already derive from `BASE_DIR`.
2. `deploy/update.sh` — same default `BASE_DIR` change; rsync targets continue to work.
3. `deploy/backup.sh` — same default `BASE_DIR` change; backup output dir becomes `/home/vmsadm/resl/vvms/backups`.
4. `deploy/README.md` — update every `/home/vmsadm/resl` reference to `/home/vmsadm/resl/vvms` (path tree, install/update commands, backup paths, troubleshooting paths, secrets section).
5. `.lovable/plan.md` — update path references for consistency.

No frontend/runtime code changes — the path is only used by deploy scripts and docs. Existing config.env is loaded relative to `BASE_DIR`, so re-running the installer on the new path simply prompts again (or copy the old file over).

## Document deliverable

Regenerate **VisiGuard-Deployment-Guide.docx** (`/mnt/documents/`) with:
- All path references switched to `/home/vmsadm/resl/vvms/...` (overview, prerequisites, install, operations, troubleshooting, reference).
- Updated example commands (`sudo SERVICE_USER=vmsadm BASE_DIR=/home/vmsadm/resl/vvms bash deploy/deploy.sh`).
- Updated directory layout diagram in §8.1.
- Visual QA pass over every page (render to images, fix any clipping/overlap before delivery).

## Migration note for existing installs

If a server was previously installed at `/home/vmsadm/resl`, the guide will include a one-time move snippet:

```bash
sudo systemctl stop visiguard-backend
sudo mv /home/vmsadm/resl /home/vmsadm/resl.old
sudo mkdir -p /home/vmsadm/resl/vvms
sudo mv /home/vmsadm/resl.old/{frontend,backend,middleware,backups,config.env} \
        /home/vmsadm/resl/vvms/
sudo chown -R vmsadm:vmsadm /home/vmsadm/resl
sudo bash /tmp/visiguard-src/deploy/deploy.sh   # idempotent, reconciles paths
```

## Out of scope

- No change to service user, Docker images, Nginx vhosts, or DNS requirements.
- No change to secrets, edge functions, or database schema.
