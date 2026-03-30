
-- Create audit_logs table
CREATE TABLE public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    entity_name text,
    details jsonb DEFAULT '{}',
    ip_address text,
    location_id uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- HO Admins can view all audit logs
CREATE POLICY "HO Admins can view all audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.is_ho_admin(auth.uid()));

-- Location admins can view logs at their locations
CREATE POLICY "Location admins can view audit logs at their locations"
ON public.audit_logs FOR SELECT TO authenticated
USING (
    location_id IN (
        SELECT location_id FROM public.user_location_roles
        WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
);

-- Authenticated users can insert audit logs
CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow anon insert for public actions (self-service, approvals)
CREATE POLICY "Anon can insert audit logs"
ON public.audit_logs FOR INSERT TO anon
WITH CHECK (true);

-- Create visitor_watchlist table
CREATE TABLE public.visitor_watchlist (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text,
    phone text,
    govt_id_number text,
    company text,
    reason text NOT NULL,
    severity text NOT NULL DEFAULT 'warning',
    photo_url text,
    is_active boolean NOT NULL DEFAULT true,
    added_by uuid,
    location_id uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.visitor_watchlist ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view watchlist (needed for check-in alerts)
CREATE POLICY "Authenticated users can view watchlist"
ON public.visitor_watchlist FOR SELECT TO authenticated
USING (true);

-- Admins/managers can manage watchlist
CREATE POLICY "Admins can insert watchlist entries"
ON public.visitor_watchlist FOR INSERT TO authenticated
WITH CHECK (
    public.is_ho_admin(auth.uid()) OR
    EXISTS (
        SELECT 1 FROM public.user_location_roles
        WHERE user_id = auth.uid() AND role IN ('admin'::app_role, 'manager'::app_role)
    )
);

CREATE POLICY "Admins can update watchlist entries"
ON public.visitor_watchlist FOR UPDATE TO authenticated
USING (
    public.is_ho_admin(auth.uid()) OR
    EXISTS (
        SELECT 1 FROM public.user_location_roles
        WHERE user_id = auth.uid() AND role IN ('admin'::app_role, 'manager'::app_role)
    )
);

CREATE POLICY "Admins can delete watchlist entries"
ON public.visitor_watchlist FOR DELETE TO authenticated
USING (
    public.is_ho_admin(auth.uid()) OR
    EXISTS (
        SELECT 1 FROM public.user_location_roles
        WHERE user_id = auth.uid() AND role IN ('admin'::app_role, 'manager'::app_role)
    )
);

-- Create index for fast lookups during check-in
CREATE INDEX idx_watchlist_name ON public.visitor_watchlist USING gin (to_tsvector('english', name));
CREATE INDEX idx_watchlist_phone ON public.visitor_watchlist (phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_watchlist_email ON public.visitor_watchlist (email) WHERE email IS NOT NULL;
CREATE INDEX idx_watchlist_govt_id ON public.visitor_watchlist (govt_id_number) WHERE govt_id_number IS NOT NULL;

-- Create indexes for audit_logs
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs (entity_type);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs (user_id);
