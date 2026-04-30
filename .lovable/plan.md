## Goal

Produce a reusable, client-ready **Project Implementation & Multi-Plant Rollout Template** for VisiGuard VMS, delivered as both `.docx` (editable) and `.pdf` (presentation-ready). Saved to `/mnt/documents/` and shown via `<lov-artifact>` for download.

This is a one-off document generation task — no app code changes.

## Document Structure

**Cover** — VisiGuard logo placeholder, title "Multi-Plant Rollout Implementation Plan", "Powered by Sharvi Infotech", customer/version placeholders.

**1. Executive Summary** — purpose, scope, deliverables, success criteria.

**2. Solution Overview** — VisiGuard modules included (Visitors, Vehicles + ANPR, Watchlist, NDA/Compliance, Reporting), HO + Plant hierarchy model.

**3. Roles & Responsibilities**
- HO Admin (single global owner, e.g. bala@sharviinfotech.com)
- Plant Admin (per-location, non-HO `admin` role) — owns plant master data, users, watchlist
- Plant Champion / Manager — daily ops, approvals
- Security Operator / Gate Security — check-in/out
- Sharvi Implementation Team — config, training, go-live support
- RACI matrix table

**4. Implementation Phases** (per plant)
1. Discovery & Sign-off (1 wk)
2. Cloud Provisioning & Branding
3. Master Data Setup
4. Hardware & Integrations (ANPR, SMTP, WhatsApp)
5. Plant Admin & User Onboarding
6. UAT
7. Pilot Go-Live (1 plant)
8. Training & Handover
9. Hypercare (2 wks post go-live)

**5. Master Data Checklist (per plant)**
Three grouped tables with columns: Item · Source · Owner · Format · Status

- **Core**: Location (name, address, lat/lng, emergency contact, assembly point), Gates (name, type, operating hours, camera URL), Departments (name, floor/section), Employees (CSV with employee_id, name, email, phone, department, host flag), Profiles & login provisioning via bulk-create-employee-users.
- **Security**: Plant Admin user, role assignments, screen permissions per role, NDA text, Watchlist seed list (name/phone/govt id/photo/severity), session timeout & auto-checkout policies.
- **Vehicles**: Vehicle Types master, Employee Vehicles (CSV with auto_allow plates), Commercial vehicle list, ANPR camera URL + CPPlus credentials (with `%40` encoding note), camera-proxy ngrok endpoint.

Each table includes "CSV template reference" row pointing to bulk import format.

**6. Tiered Rollout Timelines**

```text
Tier        Plants    HO + Pilot    Per-Plant Wave    Total
Tier 1      1         4 weeks       —                 4 weeks
Tier 2      2–5       4 weeks       2 weeks/wave×2    8–10 weeks
Tier 3      6–10      4 weeks       3 wks × 3 waves   13–16 weeks
Tier 4      10+       5 weeks       3 wks × N/4 waves 18+ weeks
```

For each tier, a Gantt-style ASCII table showing weeks W1–Wn with phases mapped (Discovery, Provision, Master Data, Hardware, UAT, Go-Live, Hypercare) and parallel waves shown as overlapping rows.

**7. Plant Admin Onboarding Playbook**
Day-by-day 5-day kit:
- Day 1: Account creation, role = `admin` at location, screen permission walkthrough
- Day 2: Master data import (departments, employees, gates)
- Day 3: Watchlist + NDA + branding
- Day 4: Vehicles + ANPR config + WhatsApp/SMTP test
- Day 5: Dry-run check-in/out, badge print, reports

**8. Integrations Setup**
Per-plant config worksheet: SMTP (host/port/user/app-password — Gmail 16-char note), Twilio WhatsApp/SMS sender, ANPR camera URL/credentials, ngrok bridge URL.

**9. Training Plan**
HO Admin (4h), Plant Admin (4h), Manager (2h), Security/Gate (1h hands-on). Includes User Manual reference and refresher cadence.

**10. UAT & Acceptance Criteria**
Test scenarios checklist (visitor walk-in, appointment, self-service QR, vehicle ANPR match, watchlist hit, emergency evacuation, auto-checkout, badge print, multi-language).

**11. Risks & Mitigation Table**
Hardware delay, network/ngrok stability, SMTP deliverability, Twilio sandbox opt-in, plant adoption.

**12. Deliverables & Sign-off**
Per-phase deliverable list with sign-off lines for HO Admin, Plant Admin, Sharvi PM.

**Appendices**
- A: CSV import templates (column headers for employees, vehicles, watchlist, departments, gates)
- B: Per-plant configuration worksheet (blank, fill-in)
- C: Glossary

## Technical Approach

1. **Generate `.docx`** via `docx` npm package (`bun` script in `/tmp/`). Use Inter-style fallback (Arial), brand color **#4F46E5** for headings, #10B981 for accents. A4 page size, 1" margins, headers/footers with page numbers, TOC.
2. **Generate `.pdf`** by converting the .docx with LibreOffice (`run_libreoffice.py --headless --convert-to pdf`).
3. **QA**: convert PDF pages to JPEGs with `pdftoppm -r 150` and visually inspect every page — check for clipped tables, overlapping headers, broken Gantt ASCII, color contrast. Iterate until clean. QA images stay in `/tmp/`.
4. Write final files to `/mnt/documents/VisiGuard_Multi_Plant_Implementation_Plan.docx` and `.pdf`.
5. Emit two `<lov-artifact>` tags for download.

## Out of Scope

- No code changes to the running app.
- No new in-app `/implementation-plan` route (can be added later if requested).
- Not customer-specific yet — fields like customer name, plant list, dates, costs are left as `<placeholder>` for sales team to fill.

Estimated output: ~25–30 page document.
