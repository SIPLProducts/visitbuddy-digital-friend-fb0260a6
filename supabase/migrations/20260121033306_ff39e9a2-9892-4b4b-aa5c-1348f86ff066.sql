-- Create screens/pages table for navigation management
CREATE TABLE public.screens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    icon TEXT,
    category TEXT,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    requires_admin BOOLEAN DEFAULT false,
    requires_manager BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.screens ENABLE ROW LEVEL SECURITY;

-- Everyone can view active screens
CREATE POLICY "Authenticated users can view screens"
ON public.screens
FOR SELECT
TO authenticated
USING (is_active = true);

-- Only HO Admins can manage screens
CREATE POLICY "HO Admins can manage screens"
ON public.screens
FOR ALL
TO authenticated
USING (public.is_ho_admin(auth.uid()))
WITH CHECK (public.is_ho_admin(auth.uid()));

-- Insert all application screens
INSERT INTO public.screens (name, path, icon, category, description, display_order, requires_admin, requires_manager) VALUES
-- Main
('Dashboard', '/', 'LayoutDashboard', 'Main', 'Overview of visitor statistics and activities', 1, false, false),

-- Visitor Management
('Visitors', '/visitors', 'Users', 'Visitor Management', 'View and manage all visitors', 10, false, false),
('New Visitor', '/visitors/new', 'UserPlus', 'Visitor Management', 'Register a new visitor', 11, false, false),
('Check-in/Out', '/check-in-out', 'QrCode', 'Visitor Management', 'Process visitor check-ins and check-outs', 12, false, false),
('Badge Printing', '/badge-printing', 'Printer', 'Visitor Management', 'Print visitor badges', 13, false, false),

-- Scheduling
('Appointments', '/appointments', 'Calendar', 'Scheduling', 'Manage visitor appointments', 20, false, false),

-- Reports
('Visitor Report', '/visitor-report', 'FileText', 'Reports', 'Generate and export visitor reports', 30, false, false),
('Analytics', '/analytics', 'BarChart3', 'Reports', 'View detailed analytics and insights', 31, false, true),

-- Configuration
('Departments', '/departments', 'Building2', 'Configuration', 'Manage departments', 40, false, true),
('Locations', '/locations', 'MapPin', 'Configuration', 'Manage facility locations', 41, true, false),
('Gates', '/gates', 'DoorOpen', 'Configuration', 'Manage entry/exit gates', 42, false, true),

-- Administration
('User Management', '/users', 'UserCog', 'Administration', 'Manage users and their roles', 50, true, false),
('Settings', '/settings', 'Settings', 'Administration', 'Application settings and preferences', 51, false, false),
('Help & Support', '/help', 'HelpCircle', 'Administration', 'Get help and support', 52, false, false);

-- Create trigger for updated_at
CREATE TRIGGER update_screens_updated_at
BEFORE UPDATE ON public.screens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();