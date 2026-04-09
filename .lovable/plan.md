

# Update ANPR Camera Qty to be Gate-Dependent + Add Kiosk/Badge Hardware

## What's Changing

1. **ANPR camera quantity** updated to clearly show it depends on gates: "1 per gate (Entry gate + Exit gate)" with a note explaining the formula
2. **Visitor check-in hardware** added: Self-Service Kiosk, Badge Printer, Badge/QR Scanner
3. Both documents (Excel + Word) updated and regenerated as v2 files

## Changes

### Excel (`gen_gantt_xlsx.py`) — Sheet 3: Hardware Requirements

Split into two sections with title rows:

**Section 1: Visitor Check-In Hardware (HO + Sites)**
| Equipment | Specification | Qty / Notes | Est. Unit Cost |
|-----------|--------------|-------------|----------------|
| Self-Service Kiosk | 10-15" touchscreen tablet with camera, wall/stand mount | 1 per location (HO + each site) | As per vendor quote |
| Badge Printer (Thermal) | Direct thermal, 100x150mm badge, USB/LAN | 1 per location | As per vendor quote |
| Badge/QR Scanner | USB/Bluetooth 2D barcode + QR handheld scanner | 1 per gate | As per vendor quote |

**Section 2: ANPR & Gate Automation Hardware (Phase 2)**
- ANPR Camera qty changed to: **"1 per gate (e.g., 2 gates = 2 cameras)"**
- Boom Barrier qty changed to: **"1 per gate"**
- Add a note row: *"Note: Camera and barrier quantities scale with the number of gates. Each gate (entry or exit) requires 1 ANPR camera + 1 boom barrier."*

### Word (`gen_timeline_docx.js`) — Hardware Requirements section

- Add a "Visitor Check-In Hardware" table before the ANPR table with same 3 items
- Update ANPR Camera row qty to "1 per gate (entry + exit)"
- Add a note paragraph explaining gate-based scaling

### Output
- `VisiGuard_Implementation_Gantt_v2.xlsx`
- `VisiGuard_Implementation_Timeline_v2.docx`
- QA both via image conversion

