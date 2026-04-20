ALTER TABLE public.tenant_settings
ADD COLUMN IF NOT EXISTS whatsapp_provider text NOT NULL DEFAULT 'twilio'
CHECK (whatsapp_provider IN ('twilio', 'whatsapp_web'));