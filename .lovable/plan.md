

## Fix "Cannot transition to a new state, already under transition" on QR scan

### Root cause

`html5-qrcode` throws this error whenever `start()`, `stop()`, or `clear()` is invoked while another transition is still in flight. Our current code triggers it three ways:

1. **`cleanupScanner()` calls `scanner.clear()` unconditionally**, even on a freshly-constructed scanner that was never started, and even when a previous `start()` is still resolving. The library treats `clear()` as a state transition and throws.
2. **`handleFacingChange` → `stopScanning()` → `startScanning()`** can fire while `isInitializing` is still true (the user taps the other pill during the ~1s startup window). Both transitions race.
3. **The Start Scanning button isn't disabled while `isInitializing`** in the right way — a double-tap kicks off two `startScanning()` runs. Same race.

### Fix in `src/components/checkin/QrScanner.tsx`

1. **Single transition lock.** Add `isTransitioningRef` (ref, not state, so it's synchronous). Set it true at the top of `startScanning` / `stopScanning` / `cleanupScanner`, release in `finally`. If any of these is called while the lock is held, await the in-flight promise (stored in `pendingTransitionRef`) instead of starting a new one.

2. **Guard `clear()`.** Wrap it in its own try/catch and only call it when `scanner` exists and is **not** scanning. Swallow the "already under transition" error specifically (match by message), since by the time we see it the scanner is effectively gone.

3. **Make `handleFacingChange` safe.**
   - Always update local state + persist preference immediately (so the UI reflects the choice even if the camera can't switch right now).
   - Only attempt the hot-swap when `isScanning === true` AND `isInitializing === false` AND the lock is free.
   - Use a small await on the pending transition before stop/start, instead of a fixed 150ms sleep.

4. **Disable pills during transition.** Both Front/Back buttons get `disabled={isInitializing || isTransitioning}` (new state mirroring the ref for render). Same for the Start Scanning button.

5. **Stop swallowing the specific error silently.** When we do hit "Cannot transition…" despite the guards, log it and silently no-op (don't surface as a red error toast — it's transient and the next user action will recover).

6. **Reset `hasHandledScanRef` consistently** so a stop+start cycle can scan again.

### Verification

```text
1. Open Check-In/Out → Scan tab.
   → Pills visible. Tap "Front camera" before starting → no error,
     pill highlights, no camera spinning up.
2. Tap "Start Scanning" → front cam opens.
3. While running, tap "Back camera" → smooth swap, no console error,
   no red banner.
4. Spam-tap the Start button or alternate pills rapidly → each tap is
   either ignored or queued; no "Cannot transition…" surfaces.
5. Stop Scanning → tap Start again → scans normally, dual-column
   visitor lookup unchanged.
6. Navigate away mid-scan → component unmounts cleanly, no console
   warnings.
```

### Out of scope
- Visitor lookup logic (the `.or()` filter + RLS fallback added previously stays).
- Photo capture component (already works).
- ANPR scanner.

