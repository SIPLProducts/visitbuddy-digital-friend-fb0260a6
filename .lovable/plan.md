## Replace login page logo with RE Sustainability logo

**Goal:** On the `/auth` page, replace the current Shield icon (shown next to "VisiGuard / Enterprise VMS") with the uploaded RE Sustainability logo image.

### Steps

1. Copy the uploaded image `user-uploads://image008.jpg` into the project at `src/assets/re-sustainability-logo.png` (PNG to preserve transparency on the dark panel).
2. Update `src/pages/Auth.tsx`:
   - Import the new logo asset.
   - **Desktop left panel** (dark branding side): replace the gradient square containing `<Shield />` with an `<img>` of the RE Sustainability logo, sized appropriately (~48–56px tall, `object-contain`), keeping the "VisiGuard / Enterprise VMS" text beside it.
   - **Mobile header** (small screens): same swap — replace the small Shield icon tile with the logo image.
3. Remove the now-unused `Shield` import if no longer referenced.

### Notes
- Only the logo mark changes; "VisiGuard" wordmark and "Enterprise VMS" tagline stay.
- No backend, routing, or auth logic changes.
