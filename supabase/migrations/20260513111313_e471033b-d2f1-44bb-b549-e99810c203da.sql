
CREATE TABLE IF NOT EXISTS public.frequent_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  name text,
  email text,
  company text,
  govt_id_number text,
  visit_count integer NOT NULL DEFAULT 0,
  last_visit_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_frequent_visitors_phone ON public.frequent_visitors(phone);

ALTER TABLE public.frequent_visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read frequent visitors"
  ON public.frequent_visitors FOR SELECT
  USING (true);

CREATE POLICY "Public can insert frequent visitors"
  ON public.frequent_visitors FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update frequent visitors"
  ON public.frequent_visitors FOR UPDATE
  USING (true);

CREATE TRIGGER update_frequent_visitors_updated_at
  BEFORE UPDATE ON public.frequent_visitors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger function: promote returning visitors after 3+ visits
CREATE OR REPLACE FUNCTION public.upsert_frequent_visitor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_phone text;
BEGIN
  v_phone := NULLIF(TRIM(NEW.phone), '');
  IF v_phone IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.visitors
  WHERE phone = v_phone;

  IF v_count >= 3 THEN
    INSERT INTO public.frequent_visitors (phone, name, email, company, govt_id_number, visit_count, last_visit_at)
    VALUES (v_phone, NEW.name, NEW.email, NEW.company, NEW.govt_id_number, v_count, now())
    ON CONFLICT (phone) DO UPDATE SET
      name = COALESCE(NULLIF(EXCLUDED.name, ''), public.frequent_visitors.name),
      email = COALESCE(NULLIF(EXCLUDED.email, ''), public.frequent_visitors.email),
      company = COALESCE(NULLIF(EXCLUDED.company, ''), public.frequent_visitors.company),
      govt_id_number = COALESCE(NULLIF(EXCLUDED.govt_id_number, ''), public.frequent_visitors.govt_id_number),
      visit_count = EXCLUDED.visit_count,
      last_visit_at = now(),
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_upsert_frequent_visitor ON public.visitors;
CREATE TRIGGER trg_upsert_frequent_visitor
  AFTER INSERT ON public.visitors
  FOR EACH ROW EXECUTE FUNCTION public.upsert_frequent_visitor();

-- Backfill from existing history
INSERT INTO public.frequent_visitors (phone, name, email, company, govt_id_number, visit_count, last_visit_at)
SELECT
  phone,
  (ARRAY_AGG(name ORDER BY created_at DESC) FILTER (WHERE name IS NOT NULL AND name <> ''))[1],
  (ARRAY_AGG(email ORDER BY created_at DESC) FILTER (WHERE email IS NOT NULL AND email <> ''))[1],
  (ARRAY_AGG(company ORDER BY created_at DESC) FILTER (WHERE company IS NOT NULL AND company <> ''))[1],
  (ARRAY_AGG(govt_id_number ORDER BY created_at DESC) FILTER (WHERE govt_id_number IS NOT NULL AND govt_id_number <> ''))[1],
  COUNT(*),
  MAX(created_at)
FROM public.visitors
WHERE phone IS NOT NULL AND TRIM(phone) <> ''
GROUP BY phone
HAVING COUNT(*) >= 3
ON CONFLICT (phone) DO NOTHING;
