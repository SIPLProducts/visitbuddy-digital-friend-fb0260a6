

# Update Login Page with Enterprise VMS Images

## Overview
Replace the icon-based feature list on the login left panel with relevant enterprise visitor management imagery — showing real-world scenarios like visitor check-in kiosks, security gates, badge printing, and facility access control.

## Approach
Use high-quality, royalty-free images from Unsplash that depict enterprise security and visitor management scenarios. Display them in an attractive image carousel/grid layout on the left panel alongside the branding.

## Changes

### File: `src/pages/Auth.tsx`

1. **Replace the features list** (icons + text) with a visual showcase section containing:
   - A hero image area showing enterprise VMS-related imagery
   - 3 thumbnail images in a row below, each representing a key feature
   - Images sourced from Unsplash (free, no attribution required):
     - Corporate office lobby / reception desk
     - Security access control / ID badge scanning
     - Modern building entrance / gate
     - Digital check-in kiosk / tablet

2. **Layout structure** for the left panel:
   - Top: VisiGuard logo (unchanged)
   - Middle: Large hero image with overlay text + 3 small feature thumbnails with captions
   - Bottom: Trust indicator (unchanged)

3. **Image styling**: Rounded corners, subtle borders, slight overlay gradient for text readability over images.

4. **Feature captions** under thumbnails:
   - "Visitor Check-In" — lobby/reception image
   - "Access Control" — security gate image
   - "Badge Management" — ID badge image

