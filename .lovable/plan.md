
The badge header currently has a **white background** with **dark gray "Resustainability"** text (just changed last turn). You want that text white — but white text on white background would be invisible.

I'll assume you want the most sensible result: keep the logo on white (your earlier requirement), and switch the company name to render on a **dark band directly below the logo** so the white text is readable.

## Plan

Update the header in `src/components/badge/SafetyPermitBadge.tsx`:

1. Keep the **logo area** white (logo on white background — preserves your earlier request, prints/PDF clean).
2. Add a thin **dark gray band (`bg-gray-800`)** immediately under the logo containing the **"Resustainability"** text in **white** (`text-white`).
3. Keep print color preservation (`print:bg-white` on logo area, `print:bg-gray-800` on text band, plus `WebkitPrintColorAdjust: 'exact'`) so both bands render correctly in print and PDF.

Result: logo sits clean on white (good for print), company name is white on a dark strip right beneath it — readable and matches "white text" intent.

If instead you wanted the **whole header back to red/dark** with logo inverted to white again (like before), reply "make whole header dark" and I'll do that variant instead.
