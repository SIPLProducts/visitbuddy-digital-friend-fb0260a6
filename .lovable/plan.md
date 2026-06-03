## Problem

On tablet and mobile, after a host approves a visitor and the security clicks **Check-In**, the "Upload" tab inside the photo capture dialog does not let the user pick an image from their device. On desktop it works fine.

## Root cause

In `src/components/checkin/CameraCapture.tsx`, the file input on the **Upload** tab is declared as:

```tsx
<input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  capture="user"   // <-- problem
  className="hidden"
  onChange={handleFileUpload}
/>
```

The `capture="user"` attribute is a mobile-specific HTML hint. On phones and tablets, it forces the browser to bypass the file picker and open the **front camera** directly. That defeats the entire purpose of the Upload tab (which exists specifically as a fallback when the camera flow doesn't work), and on many tablets the capture handoff fails silently — so nothing happens when the user taps "Click to upload photo". Desktop browsers ignore `capture`, which is why the same code works there.

## Fix

Remove the `capture="user"` attribute from the Upload tab's `<input type="file">` so mobile and tablet browsers open the native file/gallery picker — identical to desktop behavior. The Camera tab is untouched and still uses `getUserMedia` for live capture; only the explicit "Upload" fallback is changed.

No other files, no business logic, no styling changes.

## Files

- `src/components/checkin/CameraCapture.tsx` — delete the `capture="user"` line on the upload input (≈ line 537).

## Verification

1. On a tablet/mobile, approve a visitor, click **Check-In**, switch to the **Upload** tab, tap the upload area → the OS file/gallery picker opens, image can be selected, preview shows, **Use Photo** completes check-in.
2. On desktop, same flow still opens the standard file picker (unchanged).
