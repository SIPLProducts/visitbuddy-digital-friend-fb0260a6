
-- Add is_active to email_config
ALTER TABLE public.email_config ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Create email_templates table
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  to_emails TEXT[] DEFAULT '{}',
  cc_emails TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active email templates"
ON public.email_templates FOR SELECT TO authenticated
USING (is_active = true);

CREATE POLICY "HO Admins can manage email templates"
ON public.email_templates FOR ALL TO authenticated
USING (is_ho_admin(auth.uid()))
WITH CHECK (is_ho_admin(auth.uid()));

-- Create email_logs table
CREATE TABLE public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  body TEXT,
  recipients TEXT[] NOT NULL,
  cc TEXT[],
  template TEXT,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view email logs"
ON public.email_logs FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert email logs"
ON public.email_logs FOR INSERT TO authenticated
WITH CHECK (true);

-- Trigger for email_templates updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
