
## Problem

Edge functions (`test-smtp`, `send-whatsapp-badge`, etc.) return:
```json
{ "message": "name resolution failed", "request_id": "..." }
```

The Lovable app + DB work because they go through nginx/Postgres locally. Edge functions, however, run inside the `supabase-edge-functions` Docker container and need to resolve external hostnames (`smtp.gmail.com`, `api.twilio.com`, your WhatsApp bridge URL). The Deno runtime is reporting it cannot resolve DNS — meaning the container has no working resolver, or the host has no outbound DNS/egress.

## Root cause (most likely)

On a self-hosted Ubuntu server, Docker copies `/etc/resolv.conf` from the host. If the host uses `systemd-resolved` (stub `127.0.0.53`), Docker containers inherit a resolver they cannot reach, so every outbound DNS lookup fails. Less likely but possible: UFW/corporate firewall is blocking outbound 53/443/587.

## Plan

### 1. Add `deploy/diagnose-egress.sh` (read-only diagnostic)

One script that prints exactly what's broken so we don't guess:
- `getent hosts smtp.gmail.com` on host
- `cat /etc/resolv.conf` on host
- `docker exec supabase-edge-functions cat /etc/resolv.conf`
- `docker exec supabase-edge-functions getent hosts smtp.gmail.com api.twilio.com`
- `docker exec supabase-edge-functions wget -qO- --timeout=5 https://api.twilio.com 2>&1 | head -5`
- `ufw status` and outbound port test to 53/443/587

User runs it once; output tells us which fix to apply.

### 2. Add `deploy/fix-edge-dns.sh` (the fix)

Configures Docker daemon with explicit public DNS so containers stop inheriting the broken stub resolver:

```text
/etc/docker/daemon.json
{
  "dns": ["8.8.8.8", "1.1.1.1"]
}
```

Then:
- `systemctl restart docker`
- `cd backend/supabase/docker && docker compose up -d` to recreate containers with new DNS
- Re-test from inside the container: `docker exec supabase-edge-functions getent hosts smtp.gmail.com`

Safe to re-run. Preserves any existing keys in `daemon.json` if present.

### 3. Update `deploy/README-troubleshooting.md`

Add section `0f` — "Edge functions return `name resolution failed`":
- What it means (container can't reach DNS)
- Run `deploy/diagnose-egress.sh` first
- Then `sudo bash deploy/fix-edge-dns.sh`
- Firewall checklist if egress also blocked: allow outbound 53/UDP, 443/TCP, 587/TCP

### 4. No code/edge function changes

The Twilio + SMTP edge functions themselves are fine — `test-smtp` and `send-whatsapp-badge` work on Lovable Cloud. The fix is purely the on-prem Docker DNS configuration.

## Recovery sequence the user will run

```bash
cd /home/vmsadm/resl/vvms/vvms_deploy/visitbuddy-digital-friend-fb0260a6
git pull
sudo bash deploy/diagnose-egress.sh        # paste output back if anything is red
sudo bash deploy/fix-edge-dns.sh           # applies the DNS fix + restarts containers
```

Then retry the "Send Test Email" / WhatsApp test in the app.
