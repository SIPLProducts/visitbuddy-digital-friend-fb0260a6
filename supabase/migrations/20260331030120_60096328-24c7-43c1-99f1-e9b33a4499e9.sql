
-- Add new roles to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gate_security';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'visitor';
