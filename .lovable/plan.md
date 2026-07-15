## Goal

Produce a downloadable **Word (.docx)** techno-commercial proposal for the **Sharvi Visitor Management System (VisiGuard)**, using the same visual/section format as the uploaded `SIPL_Techno-commercial_Proposal_14.07.2026.docx`. Scope and Commercial sections will be intentionally left out — the customer will supply those inputs later.

Customer name is left as `<Customer Name>` placeholder throughout, since none was provided.

## Deliverable

- File: `/mnt/documents/SIPL_VMS_Techno-commercial_Proposal.docx`
- Surface via `<presentation-artifact>` tag for download.

## Document structure (mirrors SIPL format)

1. **Cover Page** — "VisiGuard – Enterprise Visitor Management System / Techno-Commercial Proposal for `<Customer Name>` / Submitted by Sharvi Infotech Pvt Ltd", dated 15 July 2026.
2. **Confidentiality Statement** — same legal wording as source, SIPL branded.
3. **Executive Summary** *(rewritten for VMS)* — introduces VisiGuard as a modern, multi-location visitor & vehicle management platform (web + PWA) built to digitize gate operations, automate host approvals, enforce safety/compliance, and give management real-time visibility across sites. Positions SIPL as the implementation partner delivering configuration, integrations (WhatsApp/SMS/Email, ANPR CCTV), rollout, training and post-go-live support.
4. **Current Status / Context** — short paragraph noting the product is production-ready, deployed for reference customers, and this proposal covers implementation & rollout for `<Customer Name>`.
5. ~~Scope Highlights~~ — **OMITTED** (customer to provide inputs).
6. **Implementation Phases & Timeline** — 5 SAP-Activate-style phases (Prepare, Explore, Realize, Deploy, Run) reframed for VMS rollout (Discovery, Configure, Pilot Gate, Rollout, Hypercare), with the same M1–M6 timeline table format.
7. **Governance & Team Structure** — Steering Committee / Project Manager / Consultants tiers plus joint Customer & SIPL delivery tracks (adapted: Solution Lead, Functional Consultants, Integration Engineers, Support Lead).
8. ~~One-Time Commercial Terms / Payment Milestones~~ — **OMITTED**.
9. **Service Level Agreement** — retain the Priority × Response/Resolution matrix (Very High / High / Medium / Low) from source.
10. ~~Consultant Working Hours & Weekend Charges~~ — **OMITTED** (commercial).
11. ~~Additional Scope & Reporting Clause~~ — **OMITTED** (commercial).
12. **Assumptions & Dependencies** — Go-Live readiness, testing environments, network/CCTV access for ANPR, WhatsApp/SMS gateway credentials, language (English/Hindi).
13. **Terms & Conditions** — full legal set from source: taxes, payment default, confidentiality survival, governing law (Hyderabad), limitation of liability, IP restriction, customer delay cost, MSA precedence.
14. **Why Sharvi Infotech** — quality assurance, client-centric approach, reliable support (from source Sec 16).
15. **Conclusion**.
16. **Acceptance & Sign-off** — signature blocks for Customer and SIPL.

## Technical approach

Use the **docx skill** (`docx-js` via Node) to author the file so styling, tables (timeline + SLA matrix), headings, page breaks, and footer branding match professional SIPL look.

Steps:
1. Copy skill scripts (`extract_document.py`, `validate_document.py`) to `/tmp` for reference/validation.
2. Copy `src/assets/resl-logo.png` and the Sharvi logo (locate in `src/assets/`) to `/tmp` for header embedding — if no Sharvi logo asset exists, use a text header "SHARVI INFOTECH" in brand red.
3. Write `/tmp/build_vms_proposal.js` using `docx-js`:
   - A4 page size, 1" margins, Arial 11pt default.
   - Heading styles H1/H2 in Sharvi red (`#dc2626`) with `outlineLevel` set.
   - Section 6 timeline table: 6-column (Phase × M1–M6) with shaded cells indicating phase span.
   - Section 9 SLA table: Priority | Response | Resolution matrix (4 priority rows).
   - Consistent footer: "Sharvi Infotech Pvt Ltd — Techno-Commercial Proposal — Confidential".
4. Run `node /tmp/build_vms_proposal.js` to emit `/mnt/documents/SIPL_VMS_Techno-commercial_Proposal.docx`.
5. Validate with `validate_document.py`.
6. QA: convert to PDF (`run_libreoffice.py --convert-to pdf`) → `pdftoppm` → `code--view` every page image → fix any layout issues → re-emit.
7. Emit `<presentation-artifact path="SIPL_VMS_Techno-commercial_Proposal.docx" mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"></presentation-artifact>`.

## Not in scope for this document

- Section 3 (Scope Highlights) — awaiting customer inputs.
- Section 6 (One-Time Commercial Terms, payment milestones, pricing tables) — awaiting customer inputs.
- Section 7 (Working hours / weekend charges) and Section 9 (Additional scope & reporting rates) — commercial, awaiting inputs.
- No changes to the in-app `/proposal` React page.
