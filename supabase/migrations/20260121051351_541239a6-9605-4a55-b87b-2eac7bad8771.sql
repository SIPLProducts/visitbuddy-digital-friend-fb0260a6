-- Create role_screen_permissions table for managing screen access per role and location
CREATE TABLE public.role_screen_permissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    screen_id UUID NOT NULL REFERENCES public.screens(id) ON DELETE CASCADE,
    can_view BOOLEAN NOT NULL DEFAULT true,
    can_edit BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (location_id, role, screen_id)
);

-- Enable RLS
ALTER TABLE public.role_screen_permissions ENABLE ROW LEVEL SECURITY;

-- Create policy for HO Admins to manage permissions
CREATE POLICY "HO Admins can manage role screen permissions"
ON public.role_screen_permissions
FOR ALL
USING (public.is_ho_admin(auth.uid()));

-- Create policy for users to view their own permissions
CREATE POLICY "Users can view permissions at their locations"
ON public.role_screen_permissions
FOR SELECT
USING (
    public.is_ho_admin(auth.uid()) OR
    EXISTS (
        SELECT 1 FROM public.user_location_roles
        WHERE user_id = auth.uid()
        AND location_id = role_screen_permissions.location_id
    )
);

-- Create trigger for updated_at
CREATE TRIGGER update_role_screen_permissions_updated_at
BEFORE UPDATE ON public.role_screen_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();