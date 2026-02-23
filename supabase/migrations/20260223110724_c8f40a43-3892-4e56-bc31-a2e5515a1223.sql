
-- Add mobile information columns to visitors table
ALTER TABLE public.visitors
  ADD COLUMN has_mobile boolean DEFAULT false,
  ADD COLUMN mobile_brand text,
  ADD COLUMN mobile_serial text;

-- Add mobile information columns to accompanying_visitors table
ALTER TABLE public.accompanying_visitors
  ADD COLUMN has_mobile boolean DEFAULT false,
  ADD COLUMN mobile_brand text,
  ADD COLUMN mobile_serial text;
