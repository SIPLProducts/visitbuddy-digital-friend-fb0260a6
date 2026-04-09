

# VisiGuard Implementation Timeline & Gantt Chart Documents

## What We're Building

Two professional documents (Word + Excel) for customer sharing, covering a **two-phase implementation**:

- **Phase 1**: VisiGuard VMS deployment across all sites, training, and issue fixing
- **Phase 2**: ANPR camera integration (hardware + software)

Both documents will include weekly timelines, task breakdowns, deliverables, and a visual Gantt chart.

---

## Document Structure

### Word Document (.docx) — "VisiGuard_Implementation_Timeline.docx"

1. **Cover Page** — RESL branding, project title, date
2. **Project Overview** — Two-phase summary with objectives
3. **Phase 1: VisiGuard Deployment** (Weeks 1-8)
   - Week-by-week task breakdown with deliverables
   - Discovery, setup, configuration, site rollout, training, UAT, go-live, hypercare
4. **Phase 2: ANPR Integration** (Weeks 9-14)
   - Camera hardware procurement & installation
   - ANPR software configuration, testing, go-live
5. **Gantt Chart Table** — Visual week-by-week grid with colored cells showing task durations across both phases
6. **Deliverables Summary** — Consolidated list of all deliverables per phase
7. **Hardware Requirements** — ANPR cameras, networking, boom barriers (referencing existing resource specs)

### Excel Document (.xlsx) — "VisiGuard_Implementation_Gantt.xlsx"

**Sheet 1: Gantt Chart**
- Rows = Tasks grouped by Phase 1 and Phase 2
- Columns = Week 1 through Week 14
- Color-coded cells (blue for Phase 1, green for Phase 2)
- Task owners, deliverables columns

**Sheet 2: Task Details**
- Detailed task list with: Task ID, Phase, Task Name, Description, Duration, Start Week, End Week, Owner, Deliverables, Status, Dependencies

**Sheet 3: Hardware Requirements**
- ANPR camera specs, networking equipment, installation requirements

---

## Technical Approach

1. **Word**: Generate using `docx` npm library (Node.js script) following existing branding patterns (navy `#1e3a8a`, cyan `#0891b2` colors, Arial font)
2. **Excel**: Generate using Python `openpyxl` following existing `gen_excel.py` styling patterns
3. **Gantt visualization**: Colored cell fills in Excel to represent task duration bars
4. Both files output to `/mnt/documents/`

---

## Timeline Content

### Phase 1: VisiGuard Deployment (Weeks 1-8)
| Week | Task | Deliverables |
|------|------|-------------|
| 1 | Discovery & requirements gathering | Project plan, scope document |
| 2 | Infrastructure setup & database config | Configured environment |
| 3 | Location, gate, department setup | System configuration |
| 4-5 | Site-by-site deployment & rollout | Deployed sites |
| 6 | User training sessions | Training materials, trained users |
| 7 | UAT & issue fixing | UAT sign-off |
| 8 | Go-live & hypercare start | Live system, support SLA |

### Phase 2: ANPR Integration (Weeks 9-14)
| Week | Task | Deliverables |
|------|------|-------------|
| 9 | Hardware procurement & site survey | Hardware order, site plan |
| 10 | Camera installation & networking | Installed cameras |
| 11 | ANPR software config & AI model setup | Configured ANPR system |
| 12 | Integration testing & calibration | Test results |
| 13 | Pilot run & fine-tuning | Pilot report |
| 14 | Full ANPR go-live & handover | Live ANPR, documentation |

