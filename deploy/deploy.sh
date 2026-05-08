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
chown -R "$SERVICE_USER:$SERVICE_USER" "$BASE_DIR"

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

prompt APP_DOMAIN              "App domain (e.g. visiguard.example.com)"
prompt API_DOMAIN              "Supabase API domain (e.g. api.visiguard.example.com)"
prompt WA_DOMAIN               "WhatsApp bridge domain"                        "wa.${APP_DOMAIN}"
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
prompt WHATSAPP_BRIDGE_URL     "WhatsApp bridge URL reachable from edge functions" "http://host.docker.internal:3001"
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
VITE_SUPABASE_URL=https://$API_DOMAIN
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
  -e "s|^SITE_URL=.*|SITE_URL=https://$APP_DOMAIN|" \
  -e "s|^API_EXTERNAL_URL=.*|API_EXTERNAL_URL=https://$API_DOMAIN|" \
  -e "s|^SUPABASE_PUBLIC_URL=.*|SUPABASE_PUBLIC_URL=https://$API_DOMAIN|" \
  -e "s|^ADDITIONAL_REDIRECT_URLS=.*|ADDITIONAL_REDIRECT_URLS=https://$APP_DOMAIN|" \
  -e "s|^SMTP_ADMIN_EMAIL=.*|SMTP_ADMIN_EMAIL=$ADMIN_EMAIL|" \
  -e "s|^SMTP_HOST=.*|SMTP_HOST=$SMTP_HOST|" \
  -e "s|^SMTP_PORT=.*|SMTP_PORT=$SMTP_PORT|" \
  -e "s|^SMTP_USER=.*|SMTP_USER=$SMTP_USER|" \
  -e "s|^SMTP_PASS=.*|SMTP_PASS=$SMTP_PASS|" \
  -e "s|^SMTP_SENDER_NAME=.*|SMTP_SENDER_NAME=VisiGuard|" \
  -e "s|^ENABLE_EMAIL_AUTOCONFIRM=.*|ENABLE_EMAIL_AUTOCONFIRM=true|" \
  -e "s|^DISABLE_SIGNUP=.*|DISABLE_SIGNUP=false|" \
  "$SUPA_DOCKER/.env"

echo ">>> Starting Supabase stack..."
cd "$SUPA_DOCKER"
docker compose pull
docker compose up -d

echo ">>> Waiting for Supabase API..."
for i in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:8000/auth/v1/health" -H "apikey: $ANON_KEY" >/dev/null 2>&1; then
    echo "    Supabase up."; break
  fi
  sleep 3
done

# Schema + seed
export PGPASSWORD="$POSTGRES_PASSWORD"
PGCONN="postgresql://postgres:$POSTGRES_PASSWORD@127.0.0.1:5432/postgres"
for i in $(seq 1 30); do
  psql "$PGCONN" -c "SELECT 1" >/dev/null 2>&1 && break || sleep 2
done

if ! psql "$PGCONN" -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='visitors'" | grep -q 1; then
  echo "    Importing init-schema.sql..."
  psql "$PGCONN" -v ON_ERROR_STOP=0 -f "$SCRIPT_DIR/init-schema.sql" || true
fi
psql "$PGCONN" -v ON_ERROR_STOP=0 -f "$SCRIPT_DIR/seed.sql" || true

# Primary admin user
echo ">>> Ensuring admin user $ADMIN_EMAIL..."
ADMIN_RESP=$(curl -fsS -X POST "http://127.0.0.1:8000/auth/v1/admin/users" \
  -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\",\"email_confirm\":true,\"user_metadata\":{\"full_name\":\"HO Admin\"}}" || true)
ADMIN_ID=$(echo "$ADMIN_RESP" | jq -r '.id // empty')
[[ -z "$ADMIN_ID" ]] && ADMIN_ID=$(psql "$PGCONN" -tAc "SELECT id FROM auth.users WHERE email='$ADMIN_EMAIL' LIMIT 1")
if [[ -n "$ADMIN_ID" ]]; then
  psql "$PGCONN" <<SQL
INSERT INTO public.profiles (user_id, full_name) VALUES ('$ADMIN_ID', 'HO Admin') ON CONFLICT DO NOTHING;
INSERT INTO public.locations (id, name, city, country, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Head Office', 'Bengaluru', 'India', 'active')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.user_location_roles (user_id, location_id, role, is_ho_admin)
VALUES ('$ADMIN_ID', '00000000-0000-0000-0000-000000000001', 'admin', true)
ON CONFLICT DO NOTHING;
SQL
fi

# Edge functions -> deploy into Supabase volume
FUNC_DIR="$SUPA_DOCKER/volumes/functions"
mkdir -p "$FUNC_DIR"
cat > "$FUNC_DIR/.env" <<EOF
SUPABASE_URL=http://kong:8000
SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
SUPABASE_DB_URL=postgresql://postgres:$POSTGRES_PASSWORD@db:5432/postgres
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

cd "$MIDDLEWARE_DIR/whatsapp-bridge"
docker build -t visiguard-wa . >/dev/null

docker rm -f wa-bridge >/dev/null 2>&1 || true
docker run -d --name wa-bridge --restart=always \
  -p 127.0.0.1:3001:3000 \
  -v "$MIDDLEWARE_DIR/whatsapp-bridge-data":/data \
  -e API_KEY="$WHATSAPP_BRIDGE_API_KEY" \
  --add-host=host.docker.internal:host-gateway \
  visiguard-wa

# ---------------------------------------------------------------
# 8) Nginx + TLS
# ---------------------------------------------------------------
echo ">>> Configuring Nginx..."
install_site() {
  local name="$1" tpl="$2" domain="$3" var="$4" extra="${5:-}"
  sed -e "s|__${var}__|$domain|g" -e "s|__ROOT__|$WWW_DIR|g" "$tpl" > "/etc/nginx/sites-available/$name"
  ln -sf "/etc/nginx/sites-available/$name" "/etc/nginx/sites-enabled/$name"
}

rm -f /etc/nginx/sites-enabled/default
install_site visiguard-app  "$SCRIPT_DIR/nginx/frontend.conf.tpl"     "$APP_DOMAIN" APP_DOMAIN
install_site visiguard-api  "$SCRIPT_DIR/nginx/supabase-api.conf.tpl" "$API_DOMAIN" API_DOMAIN
install_site visiguard-wa   "$SCRIPT_DIR/nginx/whatsapp.conf.tpl"     "$WA_DOMAIN"  WA_DOMAIN

nginx -t
systemctl reload nginx

echo ">>> Requesting Let's Encrypt certificates..."
certbot --nginx --non-interactive --agree-tos -m "$ADMIN_EMAIL" --redirect \
  -d "$APP_DOMAIN" -d "$API_DOMAIN" -d "$WA_DOMAIN" || \
  echo "WARNING: certbot failed — ensure DNS A records point to this server, then re-run deploy.sh."

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

chown -R "$SERVICE_USER:$SERVICE_USER" "$BASE_DIR"

cat <<EOF

============================================================
 DEPLOYMENT COMPLETE
============================================================
 Base:              $BASE_DIR
   frontend  ->     $FRONTEND_DIR  (built dist served by Nginx)
   backend   ->     $BACKEND_DIR/supabase
   middleware->     $MIDDLEWARE_DIR/whatsapp-bridge
   backups   ->     $BACKUP_DIR

 URLs:
   App:             https://$APP_DOMAIN
   Supabase API:    https://$API_DOMAIN
   Studio:          https://$API_DOMAIN  ($DASHBOARD_USERNAME / $DASHBOARD_PASSWORD)
   WhatsApp:        https://$WA_DOMAIN

 Admin login:       $ADMIN_EMAIL / $ADMIN_PASSWORD
 Saved config:      $ENV_FILE

 Useful commands:
   docker compose -f $SUPA_DOCKER/docker-compose.yml ps
   docker logs -f wa-bridge
   sudo bash $SCRIPT_DIR/update.sh        # redeploy after code changes

 NEXT: open https://$WA_DOMAIN to scan WhatsApp QR (first run only).
============================================================
EOF
