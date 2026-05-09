#!/usr/bin/env bash
# VisiGuard self-hosted deployment for Ubuntu 22.04 / 24.04
# Layout (all under one base dir, default /home/vmsadm/resl/vvms):
#   <BASE>/frontend     -> Vite app source + built dist
#   <BASE>/backend      -> Self-hosted Supabase (docker compose stack)
#   <BASE>/middleware   -> WhatsApp bridge + future integration services
#   <BASE>/backups      -> nightly pg_dump archives
#   <BASE>/config.env   -> persisted answers (re-used on re-run)
#
# Run as root (or via sudo) on a fresh server:
#   sudo bash deploy.sh
# Idempotent — safe to re-run.

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root: sudo bash $0"
  exit 1
fi

# ---------------------------------------------------------------
# Layout
# ---------------------------------------------------------------
SERVICE_USER="${SERVICE_USER:-vmsadm}"
BASE_DIR="${BASE_DIR:-/home/${SERVICE_USER}/resl/vvms}"
FRONTEND_DIR="$BASE_DIR/frontend"
BACKEND_DIR="$BASE_DIR/backend"
MIDDLEWARE_DIR="$BASE_DIR/middleware"
BACKUP_DIR="$BASE_DIR/backups"
WWW_DIR="$BASE_DIR/frontend/dist"          # Nginx serves directly from build output
ENV_FILE="$BASE_DIR/config.env"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"   # where this repo currently lives

# Ensure service user exists
if ! id "$SERVICE_USER" >/dev/null 2>&1; then
  useradd -m -s /bin/bash "$SERVICE_USER"
fi

mkdir -p "$BASE_DIR" "$FRONTEND_DIR" "$BACKEND_DIR" "$MIDDLEWARE_DIR" "$BACKUP_DIR"
# Scoped chown: NEVER touch backend/supabase/docker/volumes — that contains
# the live Postgres bind-mount (volumes/db/data) which must stay owned by
# uid 70 (postgres) inside the supabase-db container. A blanket
# `chown -R vmsadm $BASE_DIR` silently rewrites those data files to vmsadm
# and the next psql connection fails with:
#   FATAL: could not open file "global/pg_filenode.map": Permission denied
safe_chown_base() {
  local target="$1"
  [ -d "$target" ] || return 0
  find "$target" \
    -path "$target/backend/supabase/docker/volumes" -prune -o \
    -path "$target/backend/supabase/docker/volumes/*" -prune -o \
    \( -type f -o -type d -o -type l \) -exec chown "$SERVICE_USER:$SERVICE_USER" {} +
}
safe_chown_base "$BASE_DIR"

echo "============================================================"
echo " VisiGuard Self-Hosted Deployment"
echo " Base directory: $BASE_DIR"
echo "   ├── frontend/    (Vite app)"
echo "   ├── backend/     (self-hosted Supabase)"
echo "   ├── middleware/  (WhatsApp bridge)"
echo "   └── backups/"
echo "============================================================"

# ---------------------------------------------------------------
# 1) Collect / persist configuration
# ---------------------------------------------------------------
if [[ -f "$ENV_FILE" ]]; then
  echo "Loading saved config from $ENV_FILE"
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

prompt() {
  local var="$1" msg="$2" default="${3:-}"
  local current="${!var:-$default}" input
  if [[ -n "$current" ]]; then
    read -r -p "$msg [$current]: " input || true
    input="${input:-$current}"
  else
    read -r -p "$msg: " input
  fi
  printf -v "$var" '%s' "$input"
}

# Auto-pick the next free TCP port starting from $1 (skips anything LISTENing)
pick_port() {
  local p="$1"
  while ss -ltn "( sport = :$p )" 2>/dev/null | grep -q LISTEN; do
    p=$((p+1))
  done
  echo "$p"
}

prompt DEPLOY_MODE             "Deploy mode: 'ip' (public IP + ports, no TLS) or 'domain'" "ip"
# Always detect a public IP — needed for the WhatsApp bridge URL default in
# both 'ip' and 'domain' modes.
DETECTED_IP="$(curl -fsS --max-time 4 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"
if [[ "$DEPLOY_MODE" == "domain" ]]; then
  prompt APP_DOMAIN            "App domain (e.g. visiguard.example.com)"
  prompt API_DOMAIN            "Supabase API domain (e.g. api.visiguard.example.com)"
  prompt WA_DOMAIN             "WhatsApp bridge domain"                        "wa.${APP_DOMAIN}"
  APP_URL="https://$APP_DOMAIN"
  API_URL="https://$API_DOMAIN"
  WA_URL="https://$WA_DOMAIN"
  PUBLIC_IP="${PUBLIC_IP:-$DETECTED_IP}"
else
  prompt PUBLIC_IP             "Public IP address of this server"               "$DETECTED_IP"
  AUTO_API_PORT="$(pick_port "${API_PORT:-8000}")"
  AUTO_WA_PORT="$(pick_port "${WA_PORT:-3001}")"
  prompt API_PORT              "Port to expose Supabase API (auto-detected free port)" "$AUTO_API_PORT"
  prompt WA_PORT               "Port to expose WhatsApp bridge (0 = keep private)"     "0"
  APP_DOMAIN="$PUBLIC_IP"
  API_DOMAIN="$PUBLIC_IP"
  WA_DOMAIN="$PUBLIC_IP"
  APP_URL="http://$PUBLIC_IP"
  API_URL="http://$PUBLIC_IP:$API_PORT"
  if [[ "$WA_PORT" != "0" ]]; then WA_URL="http://$PUBLIC_IP:$WA_PORT"; else WA_URL="(internal only)"; fi
fi
prompt ADMIN_EMAIL             "Primary admin email"                            "bala@sharviinfotech.com"
prompt ADMIN_PASSWORD          "Initial admin password"                         "Sharvi@123"
prompt POSTGRES_PASSWORD       "Postgres password (auto if empty)"              ""
prompt JWT_SECRET              "Supabase JWT secret >=32 chars (auto if empty)" ""
prompt DASHBOARD_USERNAME      "Supabase Studio username"                       "supabase"
prompt DASHBOARD_PASSWORD      "Supabase Studio password (auto if empty)"       ""
prompt SMTP_HOST               "SMTP host"                                       "smtp.gmail.com"
prompt SMTP_PORT               "SMTP port"                                       "587"
prompt SMTP_USER               "SMTP username"                                   ""
prompt SMTP_PASS               "SMTP password / app password"                    ""
prompt SMTP_SENDER             "SMTP sender email"                               "$ADMIN_EMAIL"
prompt TWILIO_ACCOUNT_SID      "Twilio Account SID (optional)"                   ""
prompt TWILIO_AUTH_TOKEN       "Twilio Auth Token (optional)"                    ""
prompt TWILIO_WHATSAPP_NUMBER  "Twilio WhatsApp number (whatsapp:+1...)"         ""
prompt TWILIO_SMS_NUMBER       "Twilio SMS number (optional)"                    ""
prompt WHATSAPP_BRIDGE_API_KEY "WhatsApp bridge API key (auto if empty)"         ""
AUTO_WA_HOST_PORT="$(pick_port "${WA_HOST_PORT:-3001}")"
WA_HOST_PORT="$AUTO_WA_HOST_PORT"
# Default to the server's own IP so the bridge URL works exactly like the ngrok
# pattern (an external URL the edge function calls). Override with any reachable
# endpoint (ngrok, another VM, etc.). If the saved value still points at
# host.docker.internal (cached from an older run), replace the default with the
# detected public IP so a single Enter fixes it.
if [[ -z "${WHATSAPP_BRIDGE_URL:-}" || "$WHATSAPP_BRIDGE_URL" == *host.docker.internal* ]]; then
  WHATSAPP_BRIDGE_URL="http://${PUBLIC_IP:-host.docker.internal}:${WA_HOST_PORT}"
fi
prompt WHATSAPP_BRIDGE_URL     "WhatsApp bridge URL reachable from edge functions" "http://${PUBLIC_IP:-host.docker.internal}:${WA_HOST_PORT}"
prompt GEMINI_API_KEY          "Google Gemini API key (for ANPR, optional)"      ""
prompt RESEND_API_KEY          "Resend API key (optional)"                       ""

gen() { openssl rand -base64 36 | tr -d '/+=\n' | head -c 40; }
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(gen)}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 48 | tr -d '\n')}"
DASHBOARD_PASSWORD="${DASHBOARD_PASSWORD:-$(gen)}"
WHATSAPP_BRIDGE_API_KEY="${WHATSAPP_BRIDGE_API_KEY:-$(gen)}"

cat > "$ENV_FILE" <<EOF
SERVICE_USER=$SERVICE_USER
BASE_DIR=$BASE_DIR
DEPLOY_MODE=$DEPLOY_MODE
PUBLIC_IP=${PUBLIC_IP:-}
API_PORT=${API_PORT:-8000}
WA_PORT=${WA_PORT:-0}
APP_DOMAIN=$APP_DOMAIN
API_DOMAIN=$API_DOMAIN
WA_DOMAIN=$WA_DOMAIN
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
JWT_SECRET=$JWT_SECRET
DASHBOARD_USERNAME=$DASHBOARD_USERNAME
DASHBOARD_PASSWORD=$DASHBOARD_PASSWORD
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USER=$SMTP_USER
SMTP_PASS=$SMTP_PASS
SMTP_SENDER=$SMTP_SENDER
TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN
TWILIO_WHATSAPP_NUMBER=$TWILIO_WHATSAPP_NUMBER
TWILIO_SMS_NUMBER=$TWILIO_SMS_NUMBER
WHATSAPP_BRIDGE_API_KEY=$WHATSAPP_BRIDGE_API_KEY
WHATSAPP_BRIDGE_URL=$WHATSAPP_BRIDGE_URL
GEMINI_API_KEY=$GEMINI_API_KEY
RESEND_API_KEY=$RESEND_API_KEY
EOF
chmod 600 "$ENV_FILE"
chown "$SERVICE_USER:$SERVICE_USER" "$ENV_FILE"

# ---------------------------------------------------------------
# 2) System packages
# ---------------------------------------------------------------
echo ">>> Installing system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git ufw nginx certbot python3-certbot-nginx jq openssl ca-certificates postgresql-client gnupg lsb-release rsync

# Node.js 20
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# Docker
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
fi
usermod -aG docker "$SERVICE_USER" || true

# ---------------------------------------------------------------
# 3) Firewall
# ---------------------------------------------------------------
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 'Nginx Full'
if [[ "$DEPLOY_MODE" == "ip" ]]; then
  ufw allow ${API_PORT}/tcp
  [[ "$WA_PORT" != "0" ]] && ufw allow ${WA_PORT}/tcp || true
fi
ufw --force enable

# ---------------------------------------------------------------
# 4) JWT keys
# ---------------------------------------------------------------
echo ">>> Generating Supabase JWT keys..."
JWT_OUT=$(node "$SCRIPT_DIR/gen-jwt.js" "$JWT_SECRET")
ANON_KEY=$(echo "$JWT_OUT" | jq -r .anon)
SERVICE_ROLE_KEY=$(echo "$JWT_OUT" | jq -r .service_role)

# ---------------------------------------------------------------
# 5) FRONTEND  -> $FRONTEND_DIR
# ---------------------------------------------------------------
echo ">>> Syncing frontend source to $FRONTEND_DIR..."
rsync -a --delete \
  --exclude node_modules --exclude dist --exclude .git \
  --exclude supabase --exclude whatsapp-bridge --exclude deploy \
  "$APP_REPO_DIR"/ "$FRONTEND_DIR"/

cat > "$FRONTEND_DIR/.env.production" <<EOF
VITE_SUPABASE_URL=$API_URL
VITE_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY
VITE_SUPABASE_PROJECT_ID=self-hosted
EOF

chown -R "$SERVICE_USER:$SERVICE_USER" "$FRONTEND_DIR"

echo ">>> Building frontend..."
sudo -u "$SERVICE_USER" -H bash -c "cd '$FRONTEND_DIR' && npm ci --no-audit --no-fund && npm run build"

# ---------------------------------------------------------------
# 6) BACKEND  -> $BACKEND_DIR (self-hosted Supabase)
# ---------------------------------------------------------------
echo ">>> Setting up self-hosted Supabase in $BACKEND_DIR..."
if [[ ! -d "$BACKEND_DIR/supabase/.git" ]]; then
  git clone --depth 1 https://github.com/supabase/supabase "$BACKEND_DIR/supabase"
fi
SUPA_DOCKER="$BACKEND_DIR/supabase/docker"

cp "$SUPA_DOCKER/.env.example" "$SUPA_DOCKER/.env"
sed -i \
  -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$POSTGRES_PASSWORD|" \
  -e "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" \
  -e "s|^ANON_KEY=.*|ANON_KEY=$ANON_KEY|" \
  -e "s|^SERVICE_ROLE_KEY=.*|SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY|" \
  -e "s|^DASHBOARD_USERNAME=.*|DASHBOARD_USERNAME=$DASHBOARD_USERNAME|" \
  -e "s|^DASHBOARD_PASSWORD=.*|DASHBOARD_PASSWORD=$DASHBOARD_PASSWORD|" \
  -e "s|^SITE_URL=.*|SITE_URL=$APP_URL|" \
  -e "s|^API_EXTERNAL_URL=.*|API_EXTERNAL_URL=$API_URL|" \
  -e "s|^SUPABASE_PUBLIC_URL=.*|SUPABASE_PUBLIC_URL=$API_URL|" \
  -e "s|^ADDITIONAL_REDIRECT_URLS=.*|ADDITIONAL_REDIRECT_URLS=$APP_URL|" \
  -e "s|^SMTP_ADMIN_EMAIL=.*|SMTP_ADMIN_EMAIL=$ADMIN_EMAIL|" \
  -e "s|^SMTP_HOST=.*|SMTP_HOST=$SMTP_HOST|" \
  -e "s|^SMTP_PORT=.*|SMTP_PORT=$SMTP_PORT|" \
  -e "s|^SMTP_USER=.*|SMTP_USER=$SMTP_USER|" \
  -e "s|^SMTP_PASS=.*|SMTP_PASS=$SMTP_PASS|" \
  -e "s|^SMTP_SENDER_NAME=.*|SMTP_SENDER_NAME=VisiGuard|" \
  -e "s|^ENABLE_EMAIL_AUTOCONFIRM=.*|ENABLE_EMAIL_AUTOCONFIRM=true|" \
  -e "s|^DISABLE_SIGNUP=.*|DISABLE_SIGNUP=false|" \
  "$SUPA_DOCKER/.env"

# In IP mode, expose Kong API gateway on the public interface (default binds to 127.0.0.1)
COMPOSE_FILE="$SUPA_DOCKER/docker-compose.yml"

# Always start from a pristine compose file so re-runs cannot accumulate damage
# from previous patch attempts (duplicate keys, partial seds, etc.).
if [ -f "$COMPOSE_FILE" ] && [ ! -f "$COMPOSE_FILE.orig" ]; then
  cp "$COMPOSE_FILE" "$COMPOSE_FILE.orig"
fi
if [ -f "$COMPOSE_FILE.orig" ]; then
  cp "$COMPOSE_FILE.orig" "$COMPOSE_FILE"
fi

if [[ "$DEPLOY_MODE" == "ip" ]]; then
  # Pick a free HTTPS port for Kong too (default 8443 may already be in use)
  KONG_HTTPS_PORT="$(pick_port "${KONG_HTTPS_PORT:-8443}")"
  sed -i -E "s|127\.0\.0\.1:8000:8000|0.0.0.0:${API_PORT}:8000|g; s|127\.0\.0\.1:8443:8443|0.0.0.0:${KONG_HTTPS_PORT}:8443|g" "$COMPOSE_FILE" || true
  # Persist for downstream scripts (import-to-onprem.sh, repair-postgrest.sh)
  grep -q '^API_PORT=' "$ENV_FILE" || echo "API_PORT=$API_PORT" >> "$ENV_FILE"
  grep -q '^KONG_HTTPS_PORT=' "$ENV_FILE" || echo "KONG_HTTPS_PORT=$KONG_HTTPS_PORT" >> "$ENV_FILE"
fi

# Always publish Postgres on host 127.0.0.1:5432 so admins can connect with
# pgAdmin / DBeaver. Scripts themselves use docker exec, so the host port is
# only for humans.
POSTGRES_HOST_PORT="${POSTGRES_HOST_PORT:-5432}"
# Ensure PyYAML is available for safe YAML editing.
python3 -c 'import yaml' 2>/dev/null || sudo apt-get install -y python3-yaml >/dev/null 2>&1 || true
python3 - "$COMPOSE_FILE" "$POSTGRES_HOST_PORT" <<'PY'
import sys, yaml
path, port = sys.argv[1], sys.argv[2]
with open(path) as f:
    doc = yaml.safe_load(f)
services = doc.setdefault('services', {})
db = services.setdefault('db', {})
mapping = f"127.0.0.1:{port}:5432"
ports = db.get('ports') or []
# Drop any prior mapping that publishes container 5432 to avoid duplicates.
ports = [p for p in ports if not str(p).rstrip('"').endswith(':5432')]
ports.append(mapping)
db['ports'] = ports

# The Supabase upstream compose also publishes the supavisor "pooler" on host
# 5432 by default, which collides with our db mapping above. Strip any host
# binding on the pooler that targets 5432 (keep its 6543 transaction port and
# any other ports untouched).
for svc_name in ('pooler', 'supavisor'):
    svc = services.get(svc_name)
    if not isinstance(svc, dict):
        continue
    sp = svc.get('ports') or []
    new_sp = []
    for p in sp:
        s = str(p).rstrip('"')
        # Drop "host:container" entries where host port is 5432 OR container
        # side is 5432 (covers both "5432:5432" and "127.0.0.1:5432:5432").
        parts = s.split(':')
        host_port = parts[-2] if len(parts) >= 2 else ''
        cont_port = parts[-1]
        if host_port == '5432' or cont_port == '5432':
            continue
        new_sp.append(p)
    svc['ports'] = new_sp

with open(path, 'w') as f:
    yaml.safe_dump(doc, f, sort_keys=False)
PY
# Validate the resulting compose file before continuing.
if ! docker compose -f "$COMPOSE_FILE" config >/dev/null 2>&1; then
  echo "ERROR: docker compose config failed after patching $COMPOSE_FILE" >&2
  docker compose -f "$COMPOSE_FILE" config >&2 || true
  exit 1
fi
grep -q '^POSTGRES_HOST_PORT=' "$ENV_FILE" || echo "POSTGRES_HOST_PORT=$POSTGRES_HOST_PORT" >> "$ENV_FILE"

echo ">>> Starting Supabase stack..."
cd "$SUPA_DOCKER"

# Preflight: make absolutely sure host :5432 is free before compose tries to bind.
if ss -lnt 2>/dev/null | awk '{print $4}' | grep -qE ':5432$'; then
  echo ">>> Port 5432 is in use — attempting auto-cleanup before starting stack..."
  # Stop any docker container publishing 5432 (other than ones we own here).
  for c in $(docker ps -q --filter 'publish=5432' 2>/dev/null); do
    echo "   stopping container $c (publishing :5432)"
    docker rm -f "$c" >/dev/null 2>&1 || true
  done
  # Stop a system Postgres if installed.
  systemctl stop postgresql 2>/dev/null || true
  sleep 1
  if ss -lnt 2>/dev/null | awk '{print $4}' | grep -qE ':5432$'; then
    echo "ERROR: port 5432 still in use. Owner:" >&2
    ss -lntp 2>/dev/null | awk '/:5432 /{print}' >&2
    docker ps --filter 'publish=5432' --format '   {{.Names}}  {{.Image}}  {{.Ports}}' >&2 || true
    echo "Run: sudo bash deploy/wipe-postgres.sh --force   then re-run install.sh" >&2
    exit 1
  fi
fi

docker compose pull
docker compose up -d

echo ">>> Waiting for Supabase API..."
for i in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:${API_PORT:-8000}/auth/v1/health" -H "apikey: $ANON_KEY" >/dev/null 2>&1; then
    echo "    Supabase up."; break
  fi
  sleep 3
done

# Schema + seed (port-agnostic: go through the container, not host:5432)
PG_CONTAINER="${PG_CONTAINER:-supabase-db}"
PSQL_DOCKER="docker exec -i -e PGPASSWORD=$POSTGRES_PASSWORD $PG_CONTAINER psql -U postgres -d postgres"
for i in $(seq 1 30); do
  $PSQL_DOCKER -c "SELECT 1" >/dev/null 2>&1 && break || sleep 2
done

if ! $PSQL_DOCKER -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='visitors'" | grep -q 1; then
  if [[ "${SKIP_SCHEMA:-0}" == "1" ]]; then
    echo "    SKIP_SCHEMA=1 — leaving schema empty (redeploy.sh will apply supabase/migrations/*.sql)."
  else
    echo "    Importing init-schema.sql..."
    $PSQL_DOCKER -v ON_ERROR_STOP=0 < "$SCRIPT_DIR/init-schema.sql" || true
  fi
fi
if [[ "${SKIP_SCHEMA:-0}" == "1" ]]; then
  echo "    SKIP_SCHEMA=1 — skipping seed.sql (redeploy.sh will run import-seed.sh)."
else
  $PSQL_DOCKER -v ON_ERROR_STOP=0 < "$SCRIPT_DIR/seed.sql" || true
fi

# Primary admin user (only when schema seeding is owned by deploy.sh).
# When SKIP_SCHEMA=1, redeploy.sh applies migrations + import-seed.sh which
# already includes 00_auth_users.sql with the cloud admin row.
if [[ "${SKIP_SCHEMA:-0}" == "1" ]]; then
  echo ">>> SKIP_SCHEMA=1 — leaving admin/profile/role bootstrap to import-seed.sh."
else
echo ">>> Ensuring admin user $ADMIN_EMAIL..."
ADMIN_RESP=$(curl -fsS -X POST "http://127.0.0.1:${API_PORT:-8000}/auth/v1/admin/users" \
  -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\",\"email_confirm\":true,\"user_metadata\":{\"full_name\":\"HO Admin\"}}" || true)
ADMIN_ID=$(echo "$ADMIN_RESP" | jq -r '.id // empty')
[[ -z "$ADMIN_ID" ]] && ADMIN_ID=$($PSQL_DOCKER -tAc "SELECT id FROM auth.users WHERE email='$ADMIN_EMAIL' LIMIT 1" | tr -d ' \r\n')
if [[ -n "$ADMIN_ID" ]]; then
  $PSQL_DOCKER <<SQL
INSERT INTO public.profiles (user_id, full_name) VALUES ('$ADMIN_ID', 'HO Admin') ON CONFLICT DO NOTHING;
INSERT INTO public.locations (id, name, city, country, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Head Office', 'Bengaluru', 'India', 'active')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.user_location_roles (user_id, location_id, role, is_ho_admin)
VALUES ('$ADMIN_ID', '00000000-0000-0000-0000-000000000001', 'admin', true)
ON CONFLICT DO NOTHING;
SQL
fi
fi

# Edge functions -> deploy into Supabase volume
FUNC_DIR="$SUPA_DOCKER/volumes/functions"
mkdir -p "$FUNC_DIR"
# URL-encode the Postgres password so DATABASE_URL doesn't break on @, :, /, etc.
POSTGRES_PASSWORD_URLENC=$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1], safe=""))' "$POSTGRES_PASSWORD")
cat > "$FUNC_DIR/.env" <<EOF
SUPABASE_URL=http://kong:8000
SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
SUPABASE_DB_URL=postgresql://postgres:${POSTGRES_PASSWORD_URLENC}@db:5432/postgres
TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN
TWILIO_WHATSAPP_NUMBER=$TWILIO_WHATSAPP_NUMBER
TWILIO_SMS_NUMBER=$TWILIO_SMS_NUMBER
WHATSAPP_BRIDGE_URL=$WHATSAPP_BRIDGE_URL
WHATSAPP_BRIDGE_API_KEY=$WHATSAPP_BRIDGE_API_KEY
GEMINI_API_KEY=$GEMINI_API_KEY
RESEND_API_KEY=$RESEND_API_KEY
EOF
for fn in "$APP_REPO_DIR"/supabase/functions/*/; do
  name=$(basename "$fn")
  mkdir -p "$FUNC_DIR/$name"
  rsync -a --delete "$fn" "$FUNC_DIR/$name/"
done
docker compose -f "$SUPA_DOCKER/docker-compose.yml" restart functions || true

# ---------------------------------------------------------------
# 7) MIDDLEWARE -> $MIDDLEWARE_DIR (WhatsApp bridge)
# ---------------------------------------------------------------
echo ">>> Setting up WhatsApp bridge in $MIDDLEWARE_DIR..."
rsync -a --delete "$APP_REPO_DIR/whatsapp-bridge/" "$MIDDLEWARE_DIR/whatsapp-bridge/"
mkdir -p "$MIDDLEWARE_DIR/whatsapp-bridge-data"
chown -R "$SERVICE_USER:$SERVICE_USER" "$MIDDLEWARE_DIR"

WA_HOST_PORT="${WA_HOST_PORT:-$(pick_port 3001)}"
grep -q '^WA_HOST_PORT=' "$ENV_FILE" || echo "WA_HOST_PORT=$WA_HOST_PORT" >> "$ENV_FILE"

# WhatsApp bridge build/run is OPT-IN. By default we treat it the same way as
# the ngrok setup: an external URL (WHATSAPP_BRIDGE_URL) that the edge function
# calls. The Docker build pulls Chromium from deb.debian.org which fails behind
# many corporate firewalls — so we never run it unless asked.
#
# To run a bridge locally on this host:    sudo bash deploy/run-wa-bridge.sh
# To force build inside this script:       BUILD_WA_BRIDGE=1 bash deploy/deploy.sh
if [[ "${BUILD_WA_BRIDGE:-0}" == "1" ]]; then
  echo ">>> BUILD_WA_BRIDGE=1 — building local bridge image..."
  ( cd "$MIDDLEWARE_DIR/whatsapp-bridge" && docker build --network=host -t visiguard-wa . ) || {
    echo "WARN: WA bridge image build failed — continuing without it. Use deploy/run-wa-bridge.sh later."
    BUILD_WA_BRIDGE=0
  }
fi
if [[ "${BUILD_WA_BRIDGE:-0}" == "1" ]]; then
  docker rm -f wa-bridge >/dev/null 2>&1 || true
  docker run -d --name wa-bridge --restart=always \
    -p 0.0.0.0:${WA_HOST_PORT}:3000 \
    -v "$MIDDLEWARE_DIR/whatsapp-bridge-data":/data \
    -e API_KEY="$WHATSAPP_BRIDGE_API_KEY" \
    --add-host=host.docker.internal:host-gateway \
    visiguard-wa
else
  echo ">>> Skipping WA bridge container (external URL mode)."
  echo "    WHATSAPP_BRIDGE_URL = $WHATSAPP_BRIDGE_URL"
  echo "    To start a local bridge later: sudo bash $SCRIPT_DIR/run-wa-bridge.sh"
fi

# ---------------------------------------------------------------
# 8) Nginx + TLS
# ---------------------------------------------------------------
echo ">>> Configuring Nginx..."
install_site() {
  local name="$1" tpl="$2" domain="$3" var="$4" extra="${5:-}"
  if [[ ! -f "$tpl" ]]; then
    echo "WARN: nginx template not found: $tpl — skipping $name vhost." >&2
    return 0
  fi
  sed -e "s|__${var}__|$domain|g" -e "s|__ROOT__|$WWW_DIR|g" "$tpl" > "/etc/nginx/sites-available/$name"
  ln -sf "/etc/nginx/sites-available/$name" "/etc/nginx/sites-enabled/$name"
}

rm -f /etc/nginx/sites-enabled/default
if [[ "$DEPLOY_MODE" == "ip" ]]; then
  install_site visiguard-app "$SCRIPT_DIR/nginx/frontend-ip.conf.tpl" "_" APP_DOMAIN
  rm -f /etc/nginx/sites-enabled/visiguard-api /etc/nginx/sites-enabled/visiguard-wa
else
  install_site visiguard-app  "$SCRIPT_DIR/nginx/frontend.conf.tpl"     "$APP_DOMAIN" APP_DOMAIN
  install_site visiguard-api  "$SCRIPT_DIR/nginx/supabase-api.conf.tpl" "$API_DOMAIN" API_DOMAIN
  install_site visiguard-wa   "$SCRIPT_DIR/nginx/whatsapp.conf.tpl"     "$WA_DOMAIN"  WA_DOMAIN
fi

nginx -t
systemctl reload nginx

if [[ "$DEPLOY_MODE" == "domain" ]]; then
  echo ">>> Requesting Let's Encrypt certificates..."
  certbot --nginx --non-interactive --agree-tos -m "$ADMIN_EMAIL" --redirect \
    -d "$APP_DOMAIN" -d "$API_DOMAIN" -d "$WA_DOMAIN" || \
    echo "WARNING: certbot failed — ensure DNS A records point to this server, then re-run deploy.sh."
else
  echo ">>> Skipping TLS (IP mode). Access via plain HTTP."
fi

# ---------------------------------------------------------------
# 9) systemd: auto-start backend + nightly backup
# ---------------------------------------------------------------
cat > /etc/systemd/system/visiguard-backend.service <<EOF
[Unit]
Description=VisiGuard backend (self-hosted Supabase)
Requires=docker.service
After=docker.service network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$SUPA_DOCKER
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable visiguard-backend.service

install -m 0755 "$SCRIPT_DIR/backup.sh" /usr/local/bin/visiguard-backup
cat > /etc/cron.d/visiguard-backup <<EOF
0 2 * * * root /usr/local/bin/visiguard-backup >> /var/log/visiguard-backup.log 2>&1
EOF

# Scoped chown — see top of file for why we exclude the PG bind mount.
safe_chown_base "$BASE_DIR"

cat <<EOF

============================================================
 DEPLOYMENT COMPLETE  (mode: $DEPLOY_MODE)
============================================================
 Base:              $BASE_DIR
   frontend  ->     $FRONTEND_DIR
   backend   ->     $BACKEND_DIR/supabase
   middleware->     $MIDDLEWARE_DIR/whatsapp-bridge
   backups   ->     $BACKUP_DIR

 URLs:
   App:             $APP_URL
   Supabase API:    $API_URL
   Studio:          $API_URL  ($DASHBOARD_USERNAME / $DASHBOARD_PASSWORD)
   WhatsApp:        $WA_URL

 Admin login:       $ADMIN_EMAIL / $ADMIN_PASSWORD
 Saved config:      $ENV_FILE

 NOTE (IP mode): Browsers block camera/QR scanner & PWA install on plain
 HTTP from non-localhost origins. For production, point a domain at this
 server and re-run with DEPLOY_MODE=domain.

 Useful commands:
   docker compose -f $SUPA_DOCKER/docker-compose.yml ps
   docker logs -f wa-bridge
   sudo bash $SCRIPT_DIR/update.sh        # redeploy after code changes

 NEXT: open https://$WA_DOMAIN to scan WhatsApp QR (first run only).
============================================================
EOF
