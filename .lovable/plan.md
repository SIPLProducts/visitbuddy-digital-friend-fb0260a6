

# Fix "numeric field overflow" when updating Location coordinates

## Root cause
The `locations.latitude` column is `numeric(10,8)` (max ±99.99999999) and `longitude` is `numeric(11,8)` (max ±999.99999999). The form just calls `parseFloat()` on whatever the user types. When the user pastes a DMS string like `17'22'43.399"N` (or a raw concatenation like `1722.43399`), `parseFloat` returns a number that may exceed the column's allowed range, causing the Postgres error: *"A field with precision 10, scale 8 must round to an absolute value less than 10^2"*.

The user actually wants to enter coordinates in the DMS format (`17°22'43.399"N`, `78°34'53.476"E`), but the form only supports decimal degrees.

## Fix in `src/pages/Locations.tsx`

1. Add a helper `parseCoordinate(value)` that:
   - Trims and accepts a plain decimal (e.g. `17.378722`) → returns the number.
   - Detects DMS patterns like `17°22'43.399"N`, `17'22'43.399"N`, `17 22 43.399 N`, with separators `°`, `'`, `"`, spaces.
   - Converts DMS → decimal: `deg + min/60 + sec/3600`, negated for `S` / `W`.
   - Returns `null` if it cannot parse.

2. In `handleAdd` and `handleEdit`:
   - Replace `parseFloat(formData.latitude)` / `parseFloat(formData.longitude)` with the new helper.
   - Validate the result is within range:
     - latitude: `-90 ≤ lat ≤ 90`
     - longitude: `-180 ≤ lng ≤ 180`
   - If invalid, show a clear toast (`"Invalid latitude. Use decimal (e.g. 17.378722) or DMS (e.g. 17°22'43.399\"N)"`) and abort the save.

3. Improve the Coordinates UI:
   - Update placeholders/help text to show both accepted formats.
   - Keep the existing "Detect" geolocation button untouched (it already produces valid decimals).

4. Apply the same parsing + validation in the CSV import path (`handleFileUpload`) so bulk imports don't hit the same overflow.

## Files changed
- `src/pages/Locations.tsx`

## Expected result
- Pasting `17°22'43.399"N` / `78°34'53.476"E` (or the variant the user typed) saves correctly as `17.37872194` / `78.58207639`.
- Out-of-range or unparseable values are rejected with a friendly message instead of a database error.

