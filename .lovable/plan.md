# VisiGuard End-User Training PPT

A polished `.pptx` deck (~18 slides) for end-user training, branded with VisiGuard / Sharvi Infotech (Indigo #4F46E5 + Emerald #10B981, Inter typography), with real screenshots of the live app embedded.

## Approach

1. **Capture screenshots** of the running preview using browser tools — log in as the primary admin (`bala@sharviinfotech.com`) and navigate each key screen. Save to `/tmp/screens/`.
2. **Build the deck** with `pptxgenjs` (Node) using a consistent master: indigo header bar, emerald accent, Sharvi footer, Inter font, slide page counters.
3. **Embed images as base64** (so PDF QA conversion works).
4. **QA pass**: convert to PDF → JPGs → visually inspect every slide for overflow, contrast, alignment, low-res screenshots; fix and re-render.
5. Output `/mnt/documents/VisiGuard_User_Training.pptx` + emit a `presentation-artifact` tag.

## Slide outline (~18 slides)

1. **Cover** — "VisiGuard VMS — User Training", Sharvi logo, indigo gradient hero
2. **What is VisiGuard?** — One-paragraph intro + 4 benefit icons (Security, Speed, Compliance, Insights)
3. **Roles at a glance** — HO Admin, Location Admin, Security, Host, Self-Service visitor (table)
4. **Logging in** — Screenshot of `/auth` + demo credentials note + role-based landing
5. **Dashboard tour** — Annotated screenshot: stat tiles, quick filters (Today / Inside / Pending / Checked Out), 7-day trend
6. **Workflow 1 — Pre-registering a visitor (Host)** — Steps: New Visitor → fill form → auto-notify host
7. **Workflow 2 — Host approval** — Email/WhatsApp with Approve / Reject / Transfer links; reminder at 2:30 AM IST if still pending
8. **Workflow 3 — Self-service kiosk (Visitor)** — 4-step wizard screenshot + QR badge delivered via WhatsApp/Email
9. **Workflow 4 — Security check-in** — Search/scan QR → photo + NDA → print badge; accompanying visitors + devices captured
10. **Workflow 5 — Vehicle entry & ANPR** — Vehicles page + ANPR panel; auto-allow employee plates, commercial vehicle passes
11. **Workflow 6 — Check-out** — Security checkout, Self checkout (QR `action: checkout`), System auto-checkout 6 PM
12. **Workflow 7 — Appointments** — Command Center calendar, color-coded day view
13. **Workflow 8 — Emergency / Evacuation** — Real-time headcount + map of checked-in visitors
14. **Notifications & reminders** — WhatsApp + Email + in-app bell; auto-checkout alerts; daily 2:30 AM follow-ups
15. **Reports & analytics** — Frequent visitors, gate analytics, compliance metrics (screenshot of Reports page)
16. **Settings & masters** — Locations, Departments, Employees, Vehicle types, SMTP/Branding/Policies tabs
17. **Mobile / PWA experience** — Bottom nav, swipe gestures, pull-to-refresh; installed app screenshot
18. **Support & next steps** — Primary admin contact, training resources, Sharvi footer

## Visual style

- Indigo `#4F46E5` headers, Emerald `#10B981` accent chips, white body, slate `#1E293B` text
- Inter font (header bold, body regular)
- Each workflow slide: numbered steps (left, ~40%) + screenshot in rounded frame with subtle shadow (right, ~60%)
- Footer: "VisiGuard VMS · Powered by Sharvi Infotech" + page number

## Deliverable

`/mnt/documents/VisiGuard_User_Training.pptx` — opens in PowerPoint/Google Slides/Keynote.
