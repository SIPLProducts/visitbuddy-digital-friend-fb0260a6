

# Visitor UX Improvements: Photo Reuse, Loaders, Labels & Default Filter

## Summary
Five changes: (1) reuse self-service uploaded photo at check-in instead of forcing camera, (2) add loading spinners to Approve/Reject/CheckIn/CheckOut buttons, (3) rename all "Aadhaar"/"Govt ID" labels to "Government Photo ID", (4) default status filter to "all" for all roles, (5) show existing photo with "Use This Photo" / "Retake" options.

## Changes

### 1. `src/components/visitors/CheckInCaptureDialog.tsx` — Show existing photo, skip camera
- After watchlist check, if `visitor.photo_url` exists, display the photo with two buttons: **"Use This Photo"** (proceeds to check-in without re-upload) and **"Retake Photo"** (opens camera)
- "Use This Photo" calls handleCapture-like logic but skips upload — just updates status to `checked_in`
- Only show `CameraCapture` when no photo exists OR user clicks "Retake"
- Update dialog description text accordingly

### 2. `src/pages/Visitors.tsx` — Add loaders to Approve/Reject actions
- Add `actionLoadingId` state to track which visitor ID is being processed
- Wrap `handleApprove` and `handleReject` with `setActionLoadingId(visitor.id)` / clear on completion
- Pass `actionLoadingId` to `VisitorActions` component
- Change gate security default: remove line 110 `setStatusFilter('scheduled')` or change to `'all'`

### 3. `src/components/visitors/VisitorActions.tsx` — Show spinners on buttons
- Add `actionLoadingId?: string` prop
- When `actionLoadingId === visitor.id`, show `Loader2` spinner and disable Approve/Reject/CheckIn buttons

### 4. Label rename — "Government Photo ID" in 5 files
| File | Line | Old | New |
|------|------|-----|-----|
| `src/pages/NewVisitor.tsx` | 345 | `Aadhaar Number` | `Government Photo ID` |
| `src/components/visitors/VisitorEditDialog.tsx` | 212 | `Aadhaar Number` | `Government Photo ID` |
| `src/components/visitors/VisitorDetailsDialog.tsx` | 183 | `Govt ID Number` | `Government Photo ID` |
| `src/pages/Watchlist.tsx` | 156 | `Govt ID Number` | `Government Photo ID` |
| `src/pages/Watchlist.tsx` | 197 | `Govt ID` | `Govt Photo ID` |

### 5. `src/pages/Visitors.tsx` — Default status to "all"
- Line 110: Change `setStatusFilter('scheduled')` to `setStatusFilter('all')` for gate security users

## Files Changed
- `src/components/visitors/CheckInCaptureDialog.tsx` — Photo reuse logic with Use/Retake buttons
- `src/pages/Visitors.tsx` — Action loading state, default filter fix
- `src/components/visitors/VisitorActions.tsx` — Loading spinner props
- `src/pages/NewVisitor.tsx` — Label rename
- `src/components/visitors/VisitorEditDialog.tsx` — Label rename
- `src/components/visitors/VisitorDetailsDialog.tsx` — Label rename
- `src/pages/Watchlist.tsx` — Label rename

