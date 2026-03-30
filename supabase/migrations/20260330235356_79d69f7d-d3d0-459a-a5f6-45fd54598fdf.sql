
-- Visitor NDA/Policy Agreements table
CREATE TABLE public.visitor_agreements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id uuid NOT NULL,
    agreement_type text NOT NULL DEFAULT 'nda',
    agreement_text text NOT NULL,
    signature_data text,
    signed_at timestamp with time zone NOT NULL DEFAULT now(),
    ip_address text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.visitor_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view agreements"
ON public.visitor_agreements FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can insert agreements"
ON public.visitor_agreements FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Anon can insert agreements"
ON public.visitor_agreements FOR INSERT TO anon
WITH CHECK (true);

CREATE POLICY "Anon can view agreements"
ON public.visitor_agreements FOR SELECT TO anon
USING (true);

CREATE INDEX idx_agreements_visitor ON public.visitor_agreements (visitor_id);

-- Tenant/Branding Settings table
CREATE TABLE public.tenant_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name text NOT NULL DEFAULT 'VisiGuard',
    logo_url text,
    primary_color text DEFAULT '#0ea5e9',
    secondary_color text DEFAULT '#10b981',
    badge_logo_url text,
    badge_footer_text text DEFAULT 'Thank you for visiting',
    email_header_text text DEFAULT 'Welcome to our facility',
    email_footer_text text DEFAULT 'This is an automated message',
    nda_text text DEFAULT 'I agree to comply with all facility security policies and procedures. I understand that I must wear my visitor badge at all times and follow all safety regulations during my visit.',
    session_timeout_minutes integer DEFAULT 30,
    data_retention_days integer DEFAULT 90,
    auto_checkout_hours integer DEFAULT 12,
    enable_nda boolean DEFAULT true,
    enable_photo_capture boolean DEFAULT true,
    enable_watchlist_check boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tenant settings"
ON public.tenant_settings FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Anon can view tenant settings"
ON public.tenant_settings FOR SELECT TO anon
USING (true);

CREATE POLICY "HO Admins can manage tenant settings"
ON public.tenant_settings FOR ALL TO authenticated
USING (public.is_ho_admin(auth.uid()))
WITH CHECK (public.is_ho_admin(auth.uid()));

-- Insert default tenant settings
INSERT INTO public.tenant_settings (company_name) VALUES ('VisiGuard');

-- Enable realtime for visitors table for live counters
ALTER PUBLICATION supabase_realtime ADD TABLE public.visitors;
