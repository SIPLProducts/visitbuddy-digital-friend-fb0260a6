## New visitor ID format

Replace the current `VIS-XXXXXXXX-XXXX` random format with:

```
{PLANT_CODE}-{DDMMYY}-{NNNN}
example:  CDHYD-201125-0001
```

- **PLANT_CODE** — short code per location (same value used on Gate QR codes today, e.g. `CDHYD`).
- **DDMMYY** — date the visitor record is created (server time).
- **NNNN** — 4-digit zero-padded sequence, **per plant**, never resets, increments for every new visitor at that plant.
- Existing visitors keep their old `VIS-…` IDs — only new visitors use the new format.

## Database changes (one migration)

1. **Add `plant_code` to `locations`**
   - New `text` column, unique, nullable initially.
   - Backfill with an uppercased compact form of `locations.name` (letters/digits only, max 6 chars) so existing rows get a sane default.
   - HO Admin can edit it from the Locations screen.

2. **Per-plant counter table** `public.visitor_id_counters`
   - Columns: `location_id uuid PK`, `last_seq int not null default 0`, `updated_at timestamptz`.
   - RLS: service role / definer only; not exposed to clients.

3. **Replace `generate_visitor_id()` trigger function**
   - New SECURITY DEFINER function that runs `BEFORE INSERT` on `public.visitors`:
     - Resolve `plant_code`:
       - From `gates.location_id → locations.plant_code` using `NEW.gate_id`.
       - Fallback to a configurable default (`HO`) if no plant code is resolvable, so inserts never fail.
     - Atomically bump the counter for that location (`INSERT … ON CONFLICT DO UPDATE … RETURNING last_seq`) to get the next sequence.
     - Set `NEW.visitor_id = plant_code || '-' || to_char(now(),'DDMMYY') || '-' || lpad(seq::text,4,'0')`.
   - Keep the existing trigger binding (it already runs on insert) — only the function body changes.
   - Counter is per location and never resets, matching the chosen "Per plant only" rule.

4. **No change to `visitors.visitor_id` column type** — still `text`, still unique. Old `VIS-…` values coexist with new ones.

## Frontend changes

5. **Locations management (`src/pages/Locations.tsx`)**
   - Add a `Plant Code` input next to Name (uppercase, max ~6 chars, required for new locations, editable for existing ones).
   - Show the plant code in the locations list/table.

6. **Display only** — anywhere we render `visitor.visitor_id` already works because it's just a string. No formatting changes needed in lists, badges, QR payloads, SMS/email templates.

## Out of scope

- Not backfilling/regenerating old `VIS-…` visitor IDs.
- Not changing vehicle_id format.
- Not changing QR code payload structure (still uses `visitor.visitor_id` as the identifier).
- Not changing edge functions — they read whatever `visitor_id` was generated.

## Technical notes

- Counter table approach is concurrency-safe under Postgres `INSERT … ON CONFLICT DO UPDATE RETURNING`, avoiding the race conditions a naive `MAX(seq)+1` query would have when two visitors are created at the same instant.
- If `gate_id` is null at insert time (rare — public self-service or HO-level inserts without a gate), the function falls back to plant code `HO` so the insert still succeeds and the ID stays readable.
- Plant code is uppercased and stripped of spaces/punctuation server-side as a safety net even if an admin types `c&d hyd`.
