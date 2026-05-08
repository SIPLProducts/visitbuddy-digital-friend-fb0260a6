#!/usr/bin/env bash
# VisiGuard self-hosted deployment script for Ubuntu 22.04 / 24.04
# Run as root on a fresh server: sudo bash deploy/deploy.sh
# Idempotent — safe to re-run.

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root: sudo bash $0"
  exit 1
fi

APP_DIR="/opt/visiguard"
SUPA_DIR="/opt/supabase"
WWW_DIR="/var/www/visiguard"
ENV_FILE="/etc/visiguard.env"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "============================================================"
echo " VisiGuard Self-Hosted Deployment"
echo "============================================================"

# ---------------------------------------------------------------
# 1) Collect configuration (saved to /etc/visiguard.env, re-used on re-run)
# ---------------------------------------------------------------
if [[ -f "$ENV_FILE" ]]; then
  echo "Loading saved config from $ENV_FILE"
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

prompt() {
  local var="$1" msg="$2" default="${3:-}"
  local current="${!var:-$default}"
  local input
  if [[ -n "$current" ]]; then
    read -r -p "$msg [$current]: " input || true
    input="${input:-$current}"
  else
    read -r -p "$msg: " input
  fi
  printf -v "$var" '%s' "$input"
}

prompt APP_DOMAIN       "App domain (e.g. visiguard.example.com)"
prompt API_DOMAIN       "Supabase API domain (e.g. api.visiguard.example.com)"
prompt WA_DOMAIN        "WhatsApp bridge admin domain (e.g. wa.visiguard.example.com)" "wa.${APP_DOMAIN}"
prompt ADMIN_EMAIL      "Admin email (for Let's Encrypt + dashboard login)" "bala@sharviinfotech.com"
prompt ADMIN_PASSWORD   "Initial admin password"                                  "Sharvi@123"
prompt POSTGRES_PASSWORD "Postgres password (auto-generated if empty)"            ""
prompt JWT_SECRET       "Supabase JWT secret (>=32 chars, auto-generated if empty)" ""
prompt DASHBOARD_USERNAME "Supabase Studio username"                              "supabase"
prompt DASHBOARD_PASSWORD "Supabase Studio password (auto-generated if empty)"   ""
prompt SMTP_HOST        "SMTP host (for auth emails)"                             "smtp.gmail.com"
prompt SMTP_PORT        "SMTP port"                                                "587"
prompt SMTP_USER        "SMTP username"                                            ""
prompt SMTP_PASS        "SMTP password / app password"                             ""
prompt SMTP_SENDER      "SMTP sender email"                                        "$ADMIN_EMAIL"
prompt TWILIO_ACCOUNT_SID  "Twilio Account SID (optional)"                         ""
prompt TWILIO_AUTH_TOKEN   "Twilio Auth Token (optional)"                          ""
prompt TWILIO_WHATSAPP_NUMBER "Twilio WhatsApp number (e.g. whatsapp:+14155238886)" ""
prompt TWILIO_SMS_NUMBER      "Twilio SMS number (optional)"                       ""
prompt WHATSAPP_BRIDGE_API_KEY "WhatsApp bridge API key (auto-generated if empty)" ""
prompt GEMINI_API_KEY        "Google Gemini API key (for ANPR, optional)"          ""
prompt RESEND_API_KEY        "Resend API key (optional)"                           ""
prompt APP_REPO_BRANCH       "Git branch of the app to deploy"                     "main"

# Auto-generate secrets if empty
gen() { openssl rand -base64 36 | tr -d '/+=\n' | head -c 40; }
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(gen)}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 48 | tr -d '\n')}"
DASHBOARD_PASSWORD="${DASHBOARD_PASSWORD:-$(gen)}"
WHATSAPP_BRIDGE_API_KEY="${WHATSAPP_BRIDGE_API_KEY:-$(gen)}"

# Persist
cat > "$ENV_FILE" <<EOF
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
GEMINI_API_KEY=$GEMINI_API_KEY
RESEND_API_KEY=$RESEND_API_KEY
APP_REPO_BRANCH=$APP_REPO_BRANCH
EOF
chmod 600 "$ENV_FILE"

# ---------------------------------------------------------------
# 2) System packages
# ---------------------------------------------------------------
echo ">>> Installing system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git ufw nginx certbot python3-certbot-nginx jq openssl ca-certificates postgresql-client gnupg lsb-release

# Node.js 20 (for frontend build + JWT helper)
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

# Supabase CLI
if ! command -v supabase >/dev/null 2>&1; then
  echo ">>> Installing Supabase CLI..."
  ARCH=$(dpkg --print-architecture)
  curl -fsSL "https://github.com/supabase/cli/releases/latest/download/supabase_linux_${ARCH}.tar.gz" \
    | tar -xz -C /usr/local/bin supabase
fi

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
# 4) Generate JWT keys
# ---------------------------------------------------------------
echo ">>> Generating Supabase JWT keys..."
JWT_OUT=$(node "$SCRIPT_DIR/gen-jwt.js" "$JWT_SECRET")
ANON_KEY=$(echo "$JWT_OUT" | jq -r .anon)
SERVICE_ROLE_KEY=$(echo "$JWT_OUT" | jq -r .service_role)

# ---------------------------------------------------------------
# 5) Self-hosted Supabase stack
# ---------------------------------------------------------------
if [[ ! -d "$SUPA_DIR/.git" ]]; then
  echo ">>> Cloning Supabase repo..."
  git clone --depth 1 https://github.com/supabase/supabase "$SUPA_DIR"
fi

SUPA_DOCKER="$SUPA_DIR/docker"
cd "$SUPA_DOCKER"

if [[ ! -f .env.bak ]]; then
  cp .env.example .env.bak
fi
cp .env.example .env

# Patch values in docker/.env
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
  .env

echo ">>> Starting Supabase stack (this may take a few minutes on first run)..."
docker compose pull
docker compose up -d

echo ">>> Waiting for Kong API gateway on :8000..."
for i in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:8000/auth/v1/health" -H "apikey: $ANON_KEY" >/dev/null 2>&1; then
    echo "    Kong is up."
    break
  fi
  sleep 3
done

# ---------------------------------------------------------------
# 6) Apply schema + seed
# ---------------------------------------------------------------
echo ">>> Applying database schema..."
export PGPASSWORD="$POSTGRES_PASSWORD"
PGCONN="postgresql://postgres:$POSTGRES_PASSWORD@127.0.0.1:5432/postgres"

# Wait for postgres
for i in $(seq 1 30); do
  if psql "$PGCONN" -c "SELECT 1" >/dev/null 2>&1; then break; fi
  sleep 2
done

# Apply consolidated schema (idempotent enough for fresh DB; on re-runs we skip)
if ! psql "$PGCONN" -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='visitors'" | grep -q 1; then
  echo "    Importing init-schema.sql..."
  psql "$PGCONN" -v ON_ERROR_STOP=0 -f "$SCRIPT_DIR/init-schema.sql" || true
else
  echo "    Schema already present, skipping import."
fi

echo "    Applying seed.sql..."
psql "$PGCONN" -v ON_ERROR_STOP=0 -f "$SCRIPT_DIR/seed.sql" || true

# ---------------------------------------------------------------
# 7) Create primary admin user
# ---------------------------------------------------------------
echo ">>> Creating primary admin user $ADMIN_EMAIL..."
ADMIN_RESP=$(curl -fsS -X POST "http://127.0.0.1:8000/auth/v1/admin/users" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\",\"email_confirm\":true,\"user_metadata\":{\"full_name\":\"Bala (HO Admin)\"}}" || true)
ADMIN_ID=$(echo "$ADMIN_RESP" | jq -r '.id // empty')
if [[ -z "$ADMIN_ID" ]]; then
  ADMIN_ID=$(psql "$PGCONN" -tAc "SELECT id FROM auth.users WHERE email='$ADMIN_EMAIL' LIMIT 1")
fi

if [[ -n "$ADMIN_ID" ]]; then
  psql "$PGCONN" <<SQL
INSERT INTO public.profiles (user_id, full_name) VALUES ('$ADMIN_ID', 'Bala (HO Admin)') ON CONFLICT DO NOTHING;
INSERT INTO public.locations (id, name, city, country, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Head Office', 'Bengaluru', 'India', 'active')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.user_location_roles (user_id, location_id, role, is_ho_admin)
VALUES ('$ADMIN_ID', '00000000-0000-0000-0000-000000000001', 'admin', true)
ON CONFLICT DO NOTHING;
SQL
  echo "    Admin user ready."
fi

# ---------------------------------------------------------------
# 8) Deploy Edge Functions
# ---------------------------------------------------------------
echo ">>> Deploying edge functions to local Supabase..."
cd "$APP_DIR"

# Set secrets for functions (write to /opt/supabase/docker/volumes/functions/.env if applicable;
# self-hosted uses env vars on the edge-runtime container)
FUNC_ENV="$SUPA_DOCKER/volumes/functions/.env"
mkdir -p "$(dirname "$FUNC_ENV")"
cat > "$FUNC_ENV" <<EOF
SUPABASE_URL=http://kong:8000
SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
SUPABASE_DB_URL=postgresql://postgres:$POSTGRES_PASSWORD@db:5432/postgres
TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN
TWILIO_WHATSAPP_NUMBER=$TWILIO_WHATSAPP_NUMBER
TWILIO_SMS_NUMBER=$TWILIO_SMS_NUMBER
WHATSAPP_BRIDGE_URL=http://host.docker.internal:3001
WHATSAPP_BRIDGE_API_KEY=$WHATSAPP_BRIDGE_API_KEY
GEMINI_API_KEY=$GEMINI_API_KEY
RESEND_API_KEY=$RESEND_API_KEY
EOF

# Copy function source into Supabase volumes (self-hosted edge-runtime reads from there)
FUNC_DIR="$SUPA_DOCKER/volumes/functions"
for fn in "$APP_DIR"/supabase/functions/*/; do
  name=$(basename "$fn")
  mkdir -p "$FUNC_DIR/$name"
  cp -r "$fn"/* "$FUNC_DIR/$name/"
done

docker compose -f "$SUPA_DOCKER/docker-compose.yml" restart functions || true

# ---------------------------------------------------------------
# 9) WhatsApp bridge
# ---------------------------------------------------------------
echo ">>> Building WhatsApp bridge..."
cd "$APP_DIR/whatsapp-bridge"
docker build -t visiguard-wa . >/dev/null

docker rm -f wa-bridge >/dev/null 2>&1 || true
mkdir -p /opt/visiguard-wa-data
docker run -d --name wa-bridge --restart=always \
  -p 127.0.0.1:3001:3000 \
  -v /opt/visiguard-wa-data:/data \
  -e API_KEY="$WHATSAPP_BRIDGE_API_KEY" \
  --add-host=host.docker.internal:host-gateway \
  visiguard-wa

# ---------------------------------------------------------------
# 10) Frontend build
# ---------------------------------------------------------------
echo ">>> Building frontend..."
cd "$APP_DIR"
cat > .env.production <<EOF
VITE_SUPABASE_URL=https://$API_DOMAIN
VITE_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY
VITE_SUPABASE_PROJECT_ID=self-hosted
EOF

npm ci --no-audit --no-fund
npm run build

mkdir -p "$WWW_DIR"
rsync -a --delete dist/ "$WWW_DIR/"
chown -R www-data:www-data "$WWW_DIR"

# ---------------------------------------------------------------
# 11) Nginx + TLS
# ---------------------------------------------------------------
echo ">>> Configuring Nginx..."
install_site() {
  local name="$1" tpl="$2" domain="$3" var="$4"
  sed "s|__${var}__|$domain|g" "$tpl" > "/etc/nginx/sites-available/$name"
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
  echo "WARNING: certbot failed — DNS for $APP_DOMAIN/$API_DOMAIN/$WA_DOMAIN must point to this server."

# ---------------------------------------------------------------
# 12) Systemd unit for Supabase compose stack (auto-start on boot)
# ---------------------------------------------------------------
cat > /etc/systemd/system/supabase.service <<EOF
[Unit]
Description=Self-hosted Supabase
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
systemctl enable supabase.service

# Nightly backup
install -m 0755 "$SCRIPT_DIR/backup.sh" /usr/local/bin/visiguard-backup
cat > /etc/cron.d/visiguard-backup <<'EOF'
0 2 * * * root /usr/local/bin/visiguard-backup >> /var/log/visiguard-backup.log 2>&1
EOF

# ---------------------------------------------------------------
# 13) Summary
# ---------------------------------------------------------------
cat <<EOF

============================================================
 DEPLOYMENT COMPLETE
============================================================
 App URL:           https://$APP_DOMAIN
 Supabase API:      https://$API_DOMAIN
 Supabase Studio:   https://$API_DOMAIN  (login: $DASHBOARD_USERNAME / $DASHBOARD_PASSWORD)
 WhatsApp bridge:   https://$WA_DOMAIN   (API key in $ENV_FILE)

 Admin login:       $ADMIN_EMAIL / $ADMIN_PASSWORD

 Saved config:      $ENV_FILE
 App source:        $APP_DIR
 Supabase stack:    $SUPA_DIR
 Static frontend:   $WWW_DIR

 Useful commands:
   docker compose -f $SUPA_DOCKER/docker-compose.yml ps
   docker logs -f wa-bridge
   systemctl status supabase.service
   sudo bash $APP_DIR/deploy/update.sh   # redeploy after code pull

 NEXT STEPS:
   1. Open https://$WA_DOMAIN to scan the WhatsApp QR code (first run only).
   2. Log in to https://$APP_DOMAIN as $ADMIN_EMAIL and finish setup.
============================================================
EOF