

## Auto-refresh broken — root cause and fix

### Root cause
Several pages subscribe to Supabase Realtime using **hardcoded channel names** (`dashboard-visitors`, `visitors-page-realtime`, `dashboard-vehicles`, `dashboard-appointments`, `vehicles-page-vehicles`, `vehicles-page-entries`, `notifications-realtime`, `anpr-panel-events`, `anpr-monitor`, `anpr-vehicle-gate`).

Two failure modes result:

1. **Dashboard re-subscribes on every location change** (its `useEffect` deps are `[user, locationFilter]`). Cleanup removes the channel, but the next render immediately tries to subscribe with the **same channel name**. Supabase Realtime treats a duplicate name as a join conflict and the new channel silently never fires `postgres_changes`. After the first location switch, the Dashboard stops auto-refreshing.
2. **Multi-tab / HMR**: when the same user opens the app in two tabs (or after Vite hot-reload), both tabs try to join channels with identical names → only one wins, the other receives nothing.

This matches the symptom: app shows correct data on first load, but after a location switch / a check-in by gate security / a tab switch, the UI does not update until a manual refresh.

### Fix — make every channel name unique per mount
Append a random suffix (`crypto.randomUUID()`) to every channel name so each subscription is isolated. This is the standard Supabase Realtime fix and adds zero overhead.

Files to update (one-line change each — replace the channel name string):

1. `src/pages/Dashboard.tsx` — `dashboard-visitors`, `dashboard-vehicles`, `dashboard-appointments`
2. `src/pages/Visitors.tsx` — `visitors-page-realtime`
3. `src/pages/Vehicles.tsx` — `vehicles-page-vehicles`, `vehicles-page-entries`
4. `src/components/layout/NotificationDropdown.tsx` — `notifications-realtime`
5. `src/components/vehicles/AnprPanel.tsx` — `anpr-panel-events`
6. `src/pages/CameraMonitor.tsx` — `anpr-monitor`
7. `src/pages/VehicleGate.tsx` — `anpr-vehicle-gate`
8. `src/components/dashboard/CombinedStats.tsx` and `VisitorTrendChart.tsx` — check & apply same fix if they use channels

Pattern applied:
```ts
const channel = supabase
  .channel(`dashboard-visitors-${crypto.randomUUID()}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'visitors' }, fetchDashboardData)
  .subscribe();
```

### Bonus — log subscription status
Add `.subscribe((status) => console.debug('[realtime]', channelName, status))` on Dashboard + Visitors so future regressions are visible in the console (`SUBSCRIBED` vs `CHANNEL_ERROR` vs `TIMED_OUT`).

### Verified safe
- Realtime publication already includes `visitors`, `vehicles`, `appointments`, `notifications`, `anpr_events`, `vehicle_entries` (confirmed via DB query). No migration needed.
- No RLS change needed.
- Cleanup logic (`supabase.removeChannel`) already correct.

### Result
- Dashboard auto-refreshes after every check-in/check-out **and** after switching location.
- Visitors page auto-refreshes for all users in all tabs.
- Notification bell updates live in every open tab.
- ANPR live feeds keep working with multiple panels open.

