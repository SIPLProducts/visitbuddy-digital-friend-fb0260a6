

# CCTV Camera + ANPR Vehicle Plate Matching Integration

## Overview
Connect the CCTV/IP camera at `192.168.29.85` to the VisiGuard application. The camera feed will display on the VehicleGate page, and detected vehicle plates will be matched against registered vehicles for automatic check-in/check-out.

## Important Browser Limitation
Browsers cannot access RTSP streams directly. The camera at `192.168.29.85` likely exposes:
- **Snapshot URL**: `http://192.168.29.85/cgi-bin/snapshot.cgi` (or similar vendor-specific path)
- **MJPEG stream**: `http://192.168.29.85/video/mjpg.cgi`

The exact URL depends on the camera brand (Hikvision, Dahua, Axis, etc.). We will make this configurable per gate.

## Technical Plan

### 1. Database: Add camera + ANPR tables
**Migration:**
- Add to `gates` table: `camera_url` (text), `camera_type` (text: snapshot/mjpeg/hls), `camera_enabled` (boolean)
- Create `anpr_events` table: `id`, `plate_number`, `gate_id`, `image_url`, `matched_vehicle_id` (nullable), `match_status` (matched/unmatched/auto_checked_in), `event_time`, `location_id`, `created_at`
- Enable realtime on `anpr_events`

### 2. Edge Function: `anpr-webhook`
Receives HTTP POST from the ANPR camera/software with `{plate_number, gate_id, image_url}`:
- Searches `vehicles` table for matching `vehicle_number`
- Logs to `anpr_events` with match result
- If matched + `auto_allow = true`: auto creates vehicle entry
- Returns match result (can trigger boom barrier relay)

### 3. New Component: `CameraFeed.tsx`
- Supports snapshot (polling `<img>` every 1-2 sec), MJPEG (`<img>` direct stream), and HLS (`hls.js` + `<video>`)
- Default camera URL pre-filled as `http://192.168.29.85`
- Fullscreen toggle, connection status indicator

### 4. Update `VehicleGate.tsx`
- Add live camera feed panel showing the gate camera
- Subscribe to `anpr_events` via Realtime
- When plate detected: auto-search vehicle, show match/alert banner
- Show recent ANPR events list with match status

### 5. Update `Gates.tsx`
- Add camera configuration fields in gate edit dialog (URL, type, enabled toggle, test button)
- Pre-fill `192.168.29.85` as default

### 6. New Page: `CameraMonitor.tsx`
- Grid view of all camera-enabled gates with live feeds
- Route: `/camera-monitor`

### 7. Navigation + Routes
- Add `/camera-monitor` route in `App.tsx`
- Add "Camera Monitor" to Sidebar under Security

## Files to Create/Modify (8 files)
1. **Migration SQL** — gates columns + anpr_events table + realtime
2. `supabase/functions/anpr-webhook/index.ts` — webhook endpoint
3. `src/components/camera/CameraFeed.tsx` — reusable camera component
4. `src/pages/CameraMonitor.tsx` — multi-camera dashboard
5. `src/pages/VehicleGate.tsx` — embed camera feed + realtime ANPR alerts
6. `src/pages/Gates.tsx` — camera config fields in edit dialog
7. `src/App.tsx` — add route
8. `src/components/layout/Sidebar.tsx` — add nav link

