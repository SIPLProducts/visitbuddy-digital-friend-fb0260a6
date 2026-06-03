CREATE OR REPLACE FUNCTION public.generate_visitor_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_plant text;
  v_name  text;
  v_seq   int;
BEGIN
  -- Skip if caller already provided a visitor_id
  IF NEW.visitor_id IS NOT NULL AND length(NEW.visitor_id) > 0 THEN
    RETURN NEW;
  END IF;

  -- Resolve plant code (and fallback location name) from gate -> location
  SELECT UPPER(REGEXP_REPLACE(COALESCE(l.plant_code, ''), '[^A-Za-z0-9]', '', 'g')),
         COALESCE(l.name, '')
    INTO v_plant, v_name
  FROM public.gates g
  LEFT JOIN public.locations l ON l.id = g.location_id
  WHERE g.id = NEW.gate_id;

  -- If plant_code missing, derive prefix from location name (first 6 alnum chars, upper)
  IF v_plant IS NULL OR length(v_plant) = 0 THEN
    v_plant := UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(v_name, ''), '[^A-Za-z0-9]', '', 'g') FROM 1 FOR 6));
  END IF;

  -- Final fallback only if both plant_code AND name are unusable
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
$function$;