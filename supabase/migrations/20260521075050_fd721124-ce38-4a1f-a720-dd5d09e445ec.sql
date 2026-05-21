-- Per-location safety short code + public RPC
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS safety_short_code text;
CREATE UNIQUE INDEX IF NOT EXISTS locations_safety_short_code_key ON public.locations(safety_short_code) WHERE safety_short_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_location_safety_short_code()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_code text;
  v_attempts int := 0;
BEGIN
  LOOP
    v_code := lower(substring(md5(gen_random_uuid()::text || clock_timestamp()::text) FROM 1 FOR 6));
    IF NOT EXISTS (SELECT 1 FROM public.locations WHERE safety_short_code = v_code) THEN
      RETURN v_code;
    END IF;
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate unique safety short code';
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_location_safety_short_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.safety_short_code IS NULL OR length(NEW.safety_short_code) = 0 THEN
    NEW.safety_short_code := public.generate_location_safety_short_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_location_safety_short_code ON public.locations;
CREATE TRIGGER trg_set_location_safety_short_code
BEFORE INSERT ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.set_location_safety_short_code();

-- Backfill existing rows
UPDATE public.locations
SET safety_short_code = public.generate_location_safety_short_code()
WHERE safety_short_code IS NULL;

-- Public RPC for safety page (no auth required)
CREATE OR REPLACE FUNCTION public.get_location_safety_by_code(_code text)
RETURNS TABLE (
  name text,
  city text,
  address text,
  geo_address text,
  latitude numeric,
  longitude numeric,
  assembly_point text,
  emergency_contact text,
  phone text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT l.name, l.city, l.address, l.geo_address, l.latitude, l.longitude,
         l.assembly_point, l.emergency_contact, l.phone
  FROM public.locations l
  WHERE l.safety_short_code = lower(_code)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_location_safety_by_code(text) TO anon, authenticated;