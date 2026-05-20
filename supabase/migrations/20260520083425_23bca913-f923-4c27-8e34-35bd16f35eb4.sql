-- 1. Add plant_code to locations
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS plant_code text;

-- Backfill plant_code from name (uppercase, alphanumeric only, max 6 chars)
UPDATE public.locations
SET plant_code = UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(name,''), '[^a-zA-Z0-9]', '', 'g') FROM 1 FOR 6))
WHERE plant_code IS NULL OR plant_code = '';

-- Ensure uniqueness (case-insensitive) — append short suffix on collisions
DO $$
DECLARE
  r RECORD;
  base text;
  candidate text;
  n int;
BEGIN
  FOR r IN
    SELECT id, plant_code FROM public.locations
    WHERE plant_code IS NOT NULL
    ORDER BY created_at
  LOOP
    base := r.plant_code;
    candidate := base;
    n := 1;
    WHILE EXISTS (
      SELECT 1 FROM public.locations
      WHERE UPPER(plant_code) = UPPER(candidate) AND id <> r.id
    ) LOOP
      n := n + 1;
      candidate := SUBSTRING(base FROM 1 FOR GREATEST(1, 6 - length(n::text))) || n::text;
    END LOOP;
    IF candidate <> r.plant_code THEN
      UPDATE public.locations SET plant_code = candidate WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS locations_plant_code_unique_ci
  ON public.locations (UPPER(plant_code));

-- 2. Counter table
CREATE TABLE IF NOT EXISTS public.visitor_id_counters (
  location_key text PRIMARY KEY,
  last_seq integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.visitor_id_counters ENABLE ROW LEVEL SECURITY;

-- No client-side policies needed; SECURITY DEFINER function bypasses RLS.

-- 3. Replace generator function
CREATE OR REPLACE FUNCTION public.generate_visitor_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plant text;
  v_seq   int;
BEGIN
  -- Skip if caller already provided a visitor_id
  IF NEW.visitor_id IS NOT NULL AND length(NEW.visitor_id) > 0 THEN
    RETURN NEW;
  END IF;

  -- Resolve plant code from gate -> location
  SELECT UPPER(REGEXP_REPLACE(COALESCE(l.plant_code, ''), '[^A-Za-z0-9]', '', 'g'))
    INTO v_plant
  FROM public.gates g
  LEFT JOIN public.locations l ON l.id = g.location_id
  WHERE g.id = NEW.gate_id;

  IF v_plant IS NULL OR length(v_plant) = 0 THEN
    v_plant := 'HO';
  END IF;

  -- Atomic per-plant counter increment
  INSERT INTO public.visitor_id_counters (location_key, last_seq, updated_at)
  VALUES (v_plant, 1, now())
  ON CONFLICT (location_key) DO UPDATE
    SET last_seq = public.visitor_id_counters.last_seq + 1,
        updated_at = now()
  RETURNING last_seq INTO v_seq;

  NEW.visitor_id := v_plant || '-' || to_char(now(), 'DDMMYY') || '-' || lpad(v_seq::text, 4, '0');
  RETURN NEW;
END;
$$;