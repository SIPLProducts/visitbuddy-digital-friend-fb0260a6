## Frequent Visitor Auto-Fill (3+ visits)

When a visitor has 3 or more past visits, save their core profile and auto-fill it on future registrations when the security operator types their phone number.

### 1. New table: `frequent_visitors`

Store one row per recurring visitor, keyed by phone number.

Columns:
- `phone` (text, unique) — primary lookup key
- `name`, `email`, `company`, `govt_id_number`
- `visit_count` (int)
- `last_visit_at` (timestamptz)
- standard `id`, `created_at`, `updated_at`

RLS: authenticated users at any location can SELECT/INSERT/UPDATE (used by registration flow).

### 2. Auto-promotion trigger

Database trigger on `visitors` AFTER INSERT:
- Count distinct prior visits for the same `phone` (including the new one).
- If count ≥ 3, UPSERT into `frequent_visitors` with the latest non-null values for name/email/company/govt_id_number, and refresh `visit_count` + `last_visit_at`.
- If row already exists, just update the latest details and counters on every subsequent visit.

This means the table fills itself from existing history retroactively only on the next visit; we'll also run a one-time backfill for existing visitors who already cross the threshold.

### 3. Backfill (one-time)

SQL inside the migration: aggregate `visitors` by `phone`, take rows with count ≥ 3, insert into `frequent_visitors` using most recent non-null values.

### 4. UI: auto-fill on phone entry in `src/pages/NewVisitor.tsx`

- Debounce (~500 ms) on the Phone input.
- When phone has ≥10 digits, query `frequent_visitors` by phone.
- If found:
  - Auto-fill Name, Email, Company, Government ID using `form.setValue(..., { shouldDirty: true })` only for fields the user hasn't manually typed.
  - Show a small inline badge/toast: "Returning visitor — details auto-filled (X previous visits)".
- If not found, do nothing.

No change to `VisitorEditDialog` or other flows.

### Out of scope
- No change to self-service portal (can be added later if requested).
- No UI to manage the frequent_visitors list (driven entirely by trigger).
