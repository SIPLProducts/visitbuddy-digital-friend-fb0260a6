-- Add accompanying_count column to track additional visitors with the main visitor
ALTER TABLE public.visitors 
ADD COLUMN accompanying_count integer DEFAULT 0;

-- Add a comment for clarity
COMMENT ON COLUMN public.visitors.accompanying_count IS 'Number of additional people accompanying the main visitor';