

# Auto-Capture Photo During Check-In and Print Badge

## Summary
When gate security checks in a visitor, the system will automatically open the camera to capture the visitor's photo, save it, then print the badge — all in one seamless flow.

## Current Flow
1. Gate security clicks "Check In" or "Check In & Print"
2. Confirmation dialog opens → confirm → visitor is checked in
3. If "Check In & Print", badge opens in new tab

## New Flow
1. Gate security clicks "Check In & Print" (or "Check In")
2. **Camera dialog opens automatically** with live camera feed
3. Security captures the visitor's photo
4. Photo is uploaded to the `visitor-photos` storage bucket
5. Visitor record is updated with `photo_url`, status set to `checked_in`, and `check_in_time`
6. Badge automatically opens in a new tab for printing
7. Toast confirmation shown

## Changes

### 1. `src/pages/Visitors.tsx`
- Modify `handleCheckIn` and `handleCheckInAndPrint` to open a new **photo capture dialog** instead of the simple CheckInDialog
- Add state for photo capture dialog (`showPhotoCaptureDialog`)
- After photo is captured:
  - Upload photo blob to `visitor-photos` bucket with path `{visitor_id}/checkin.jpg`
  - Get the public URL
  - Update visitor record: `status = 'checked_in'`, `check_in_time`, `photo_url`
  - Auto-open print badge page
- Keep watchlist check before allowing photo capture

### 2. Create `src/components/visitors/CheckInCaptureDialog.tsx`
- New dialog component that combines:
  - Watchlist check (from existing CheckInDialog logic)
  - If watchlist is clear (or warning-only), show the `CameraCapture` component automatically
  - After photo capture, show a brief preview with "Confirm Check-In" button
  - On confirm: upload photo → update visitor → open badge → close dialog
- Uses existing `CameraCapture` component for camera/upload functionality
- Shows loading state during upload and check-in

### 3. `src/components/visitors/CheckInDialog.tsx`
- No changes needed — kept for backward compatibility with other pages (CheckInOut, etc.)

### 4. `src/components/dashboard/RecentVisitors.tsx`
- Update the check-in handler to also use the photo capture flow (same pattern as Visitors.tsx)

## Technical Notes
- Reuses existing `CameraCapture` component (camera + upload tabs)
- Uses existing `visitor-photos` storage bucket (already public)
- Photo URL stored in visitor's `photo_url` field
- Badge print page already reads `photo_url`, so captured photo will appear on the badge automatically

