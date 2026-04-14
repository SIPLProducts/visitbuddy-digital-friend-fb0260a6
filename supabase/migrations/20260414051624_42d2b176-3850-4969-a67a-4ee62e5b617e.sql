CREATE TABLE public.email_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  smtp_host text NOT NULL,
  smtp_port integer NOT NULL DEFAULT 587,
  smtp_username text NOT NULL,
  smtp_password text NOT NULL,
  sender_name text NOT NULL DEFAULT '',
  sender_email text NOT NULL,
  use_tls boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HO Admins can manage email config" ON public.email_config
  FOR ALL TO authenticated
  USING (public.is_ho_admin(auth.uid()))
  WITH CHECK (public.is_ho_admin(auth.uid()));

CREATE POLICY "Authenticated can view email config" ON public.email_config
  FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_email_config_updated_at
  BEFORE UPDATE ON public.email_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();