Fill the uploaded VAPT questionnaire, leaving all server / network / wireless / config / architecture sections marked **"Not in scope"**, and populating only the **Web Application Security** rows for both Internal and External sheets. Mobile Application sections marked **"No – Not applicable (no native mobile app; PWA covered under Web scope)"**.

## Values to enter

**Sheet: Internal VA & PT**
- Server VAPT rows (workstations, servers, config review): `Not in scope`
- Web Application Security (Internal): `Yes`
  - Application details row: `Internal Applications / VisiGuard VMS (Admin/Security/Host Portal) / 60 / 5 / White box / Onsite`
  - Remarks: `5 roles = HO Admin, Location Admin, Security Guard, Host/Employee, Self-Service Visitor. React 18 + Vite SPA on Supabase (PostgREST + Edge Functions).`
- Mobile Application Security (Internal): `No – Not applicable (PWA; covered under Web scope)`
- Wireless PT + Other Devices (switches, firewalls): `Not in scope`

**Sheet: External VA & PT**
- Server VAPT (No of external IPs): `Not in scope`
- Web Application Security (External): `Yes`
  - Application details row: `External (Internet Facing) Applications / VisiGuard VMS / 60 / 5 / White box / Offsite`
  - Remarks: `URLs: https://visiguard.sharvisoftwareservices.com and https://visitbuddy-digital-friend.lovable.app. Same codebase as internal. Testers will be given credentials for all 5 roles plus source code access.`
- Mobile Application Security (External): `No – Not applicable`
- Other Devices (Routers/IDS/IPS): `Not in scope`

**Sheet: Config Review** — every row: `Not in scope`
**Sheet: Architecture Review** — every row: `Not in scope` (leave existing 0s replaced with the text)

## Deliverable

Write filled workbook to `/mnt/documents/VAPT_questionnaire_VisiGuard_filled.xlsx` (preserving original formatting via openpyxl load/save) and surface it with a `<presentation-artifact>` tag for download.
