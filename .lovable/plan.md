
# Architecture Diagram for VisiGuard VMS Infrastructure

## Overview
Add a new page (Page 6) to the Resource Requirements document with a visual architecture diagram that helps infrastructure teams understand the complete server and hardware setup required to run VisiGuard VMS smoothly.

## What Will Be Added

### New Architecture Diagram Page
A dedicated page inserted before the Manpower section containing:

1. **System Architecture Diagram** - A visual block diagram built with styled HTML/CSS boxes and connectors showing:
   - **Internet/Client Layer**: Browsers, tablets, smartphones connecting via HTTPS
   - **Load Balancer / Reverse Proxy**: Nginx/Caddy entry point
   - **Application Layer**: VisiGuard Web App (React PWA) + Backend API (Edge Functions)
   - **Database Layer**: PostgreSQL primary + Redis cache (optional)
   - **Storage Layer**: File storage for badges, photos, documents
   - **External Services**: Twilio (SMS/WhatsApp), Resend (Email), ANPR Camera feeds
   - **Network Components**: Firewall, VPN (multi-site), DNS

2. **Hardware Connectivity Diagram** - Shows physical connections at gate level:
   - Gate Tablet/Kiosk connected to Wi-Fi AP
   - Badge Printer (USB/Network)
   - QR/Barcode Scanner (USB/Bluetooth)
   - ANPR Camera (IP Network)
   - Boom Barrier (Controller via ANPR)
   - RFID Reader (UHF)
   - All connecting back to the server via LAN/Wi-Fi

3. **Data Flow Summary Table** - A quick-reference table showing:
   - Source to Destination
   - Protocol/Port
   - Purpose (e.g., "Browser to Server | HTTPS/443 | App access")

## Technical Details

### File to Modify
- `src/pages/ResourceRequirements.tsx`

### Changes
- Add a new `data-pdf-section` div between the Network/Client Requirements page (Page 4) and the Manpower page (Page 5)
- The diagram will use pure HTML/CSS boxes with borders, background colors, and arrows (using CSS borders/pseudo-elements or Unicode arrows) for maximum PDF compatibility
- No external charting library needed -- styled divs ensure html2canvas captures everything correctly
- Consistent styling with existing pages (same border colors, fonts, section headers)

### Diagram Layout (Vertical Flow)

```text
+--------------------------------------------------+
|              INTERNET / CLIENTS                   |
|  [Browser] [Tablet] [Smartphone] [Self-Service]  |
+--------------------------------------------------+
                      |
                  HTTPS / 443
                      |
+--------------------------------------------------+
|         FIREWALL / WAF / DDoS Protection         |
+--------------------------------------------------+
                      |
+--------------------------------------------------+
|       LOAD BALANCER / REVERSE PROXY (Nginx)      |
+--------------------------------------------------+
              |                    |
+-------------+------+  +---------+---------+
| APPLICATION SERVER |  |  EDGE FUNCTIONS   |
| React PWA (Static) |  | (API / Webhooks)  |
+--------------------+  +-------------------+
              |                    |
+--------------------------------------------------+
|              DATABASE LAYER                       |
|  [PostgreSQL 15+]    [Redis Cache (optional)]    |
+--------------------------------------------------+
              |
+--------------------------------------------------+
|            FILE STORAGE / BACKUPS                 |
|  [Badge Photos] [Documents] [NAS/S3 Backup]     |
+--------------------------------------------------+

+--------------------------------------------------+
|          EXTERNAL INTEGRATIONS                    |
|  [Twilio SMS/WA] [Resend Email] [Google Maps]   |
+--------------------------------------------------+

--- GATE HARDWARE LAYOUT ---

+--------------------------------------------------+
|                 GATE SETUP                        |
|                                                   |
|  [Tablet/Kiosk] ---Wi-Fi---> [Access Point]      |
|  [Badge Printer] ---USB/LAN--> [Gate PC]         |
|  [QR Scanner] ---USB/BT--> [Gate PC/Tablet]      |
|  [ANPR Camera] ---IP/PoE--> [NVR/Server]         |
|  [Boom Barrier] ---Controller--> [ANPR System]   |
|  [RFID Reader] ---UHF--> [Gate Controller]       |
+--------------------------------------------------+
```

### Styling Approach
- Each layer rendered as a colored box with rounded corners
- Arrows between layers using styled divs with Unicode characters
- Color coding: Blue for compute, green for database, orange for external, gray for network
- Consistent with existing page design (primary color borders, muted backgrounds)
