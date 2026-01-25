-- Add 'pending_approval' to the visitor_status enum
-- Note: This must be in its own transaction before being used
ALTER TYPE public.visitor_status ADD VALUE IF NOT EXISTS 'pending_approval';