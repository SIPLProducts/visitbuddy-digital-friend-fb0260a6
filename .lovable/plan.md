

## Root cause

Console confirms `Html5Qrcode.start()` succeeds (`Camera started: environment (back)`). But session replay shows the injected `<video>` immediately fires `paused` then `ended`, then the UI reverts to "Scanner paused". On tablet, the camera stream is acquired but the `<video>` element never plays.

Cause: the scanner container's React state is changing **while** html5-qrcode is attaching the `<video>` and calling `play()`:
- `className` flips `w-48 h-48` → `w-72 h-72` (layout reflow)
- `#qr-reader` style flips `visibility:hidden`/`position:absolute` → `visibility:visible`/`position:relative`
- The "Starting camera…" overlay sits on top with `z-10` and `backdrop-blur-sm`, intercepting the video paint

Mobile/tablet browsers (especially iPad Safari and Android Chrome WebView) treat a `<video>` whose ancestor visibility/layout is changing during `play()` as ineligible for autoplay → silent pause → "ended".

## Fix (one file: `src/components/checkin/QrScanner.tsx`)

1. **Stop toggling `visibility` and `position` on `#qr-reader`.** Render it always-visible at full size. Use a separate sibling placeholder (camera icon) that's only mounted when not scanning — never overlay or hide the actual video container.

2. **Stop toggling the wrapper's size class.** Keep the wrapper at a single fixed size (`w-72 h-72` or responsive `w-full max-w-xs aspect-square`) so no layout reflow happens when scanning starts.

3. **Remove the full-cover "Starting camera…" overlay.** Replace it with a small spinner badge in a corner (`absolute top-2 right-2`) that doesn't sit on top of the video. The overlay's `backdrop-blur` + `inset-0` is what's blocking the video paint on tablets.

4. **Force-play the video after `start()` resolves.** Query `#qr-reader video`, set `playsInline`, `muted`, `autoplay` attributes explicitly, and call `.play().catch()`. iOS/iPadOS requires `playsinline` + `muted` for autoplay — html5-qrcode sets these but they get stripped if the element is re-parented.

5. **Add a MutationObserver-free safeguard:** after `start()` succeeds, wait one frame (`requestAnimationFrame`), then check `videoEl.paused`. If paused, call `videoEl.play()` once more. Log the outcome.

### File touched
- `src/components/checkin/QrScanner.tsx` (only)

### Result
- Tablet: video element stays mounted in stable container, plays inline immediately, no pause/ended cycle.
- Desktop: unchanged behavior — still works.
- Mobile phone: unchanged (already worked).

