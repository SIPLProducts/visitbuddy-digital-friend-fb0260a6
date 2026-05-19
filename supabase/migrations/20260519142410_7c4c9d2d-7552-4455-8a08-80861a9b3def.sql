
ALTER TABLE public.visitors
  ADD COLUMN IF NOT EXISTS short_code text;

CREATE UNIQUE INDEX IF NOT EXISTS visitors_short_code_key
  ON public.visitors (short_code);

CREATE OR REPLACE FUNCTION public.generate_visitor_short_code()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_code text;
  v_attempts int := 0;
BEGIN
  LOOP
    v_code := lower(substring(md5(gen_random_uuid()::text || clock_timestamp()::text) FROM 1 FOR 8));
    IF NOT EXISTS (SELECT 1 FROM public.visitors WHERE short_code = v_code) THEN
      RETURN v_code;
    END IF;
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate unique visitor short_code';
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_visitor_short_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.short_code IS NULL OR length(NEW.short_code) = 0 THEN
    NEW.short_code := public.generate_visitor_short_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_visitor_short_code ON public.visitors;
CREATE TRIGGER trg_set_visitor_short_code
  BEFORE INSERT ON public.visitors
  FOR EACH ROW EXECUTE FUNCTION public.set_visitor_short_code();

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.visitors WHERE short_code IS NULL LOOP
    UPDATE public.visitors SET short_code = public.generate_visitor_short_code() WHERE id = r.id;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.get_visitor_id_by_short_code(_short_code text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT visitor_id FROM public.visitors WHERE short_code = _short_code LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_visitor_id_by_short_code(text) TO anon, authenticated;
