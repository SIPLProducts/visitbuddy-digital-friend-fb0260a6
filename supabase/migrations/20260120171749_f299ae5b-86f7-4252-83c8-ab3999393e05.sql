-- Create enum types for various statuses
CREATE TYPE public.visitor_status AS ENUM ('checked_in', 'checked_out', 'scheduled', 'cancelled');
CREATE TYPE public.appointment_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
CREATE TYPE public.gate_status AS ENUM ('active', 'inactive');
CREATE TYPE public.location_status AS ENUM ('active', 'inactive');

-- Create profiles table for admin users
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create departments table
CREATE TABLE public.departments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    employee_count INTEGER DEFAULT 0,
    active_visitors INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employees table (hosts)
CREATE TABLE public.employees (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT,
    position TEXT,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    is_host BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create locations table
CREATE TABLE public.locations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    country TEXT DEFAULT 'India',
    status location_status DEFAULT 'active',
    gate_count INTEGER DEFAULT 0,
    department_count INTEGER DEFAULT 0,
    visitor_count INTEGER DEFAULT 0,
    capacity_usage INTEGER DEFAULT 0,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create gates table
CREATE TABLE public.gates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    building TEXT,
    status gate_status DEFAULT 'active',
    gate_type TEXT DEFAULT 'Entry & Exit',
    has_qr BOOLEAN DEFAULT true,
    capacity INTEGER DEFAULT 100,
    current_visitors INTEGER DEFAULT 0,
    operating_hours TEXT DEFAULT '06:00 - 22:00',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create visitors table
CREATE TABLE public.visitors (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    visitor_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    purpose TEXT,
    host_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    gate_id UUID REFERENCES public.gates(id) ON DELETE SET NULL,
    laptop_brand TEXT,
    laptop_serial TEXT,
    has_laptop BOOLEAN DEFAULT false,
    status visitor_status DEFAULT 'scheduled',
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    badge_printed BOOLEAN DEFAULT false,
    qr_code TEXT,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appointments table
CREATE TABLE public.appointments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    visitor_name TEXT NOT NULL,
    visitor_email TEXT,
    visitor_phone TEXT,
    company TEXT,
    host_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    purpose TEXT,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    status appointment_status DEFAULT 'pending',
    has_teams_meeting BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for departments (authenticated users can read, admin can modify)
CREATE POLICY "Authenticated users can view departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert departments" ON public.departments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update departments" ON public.departments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete departments" ON public.departments FOR DELETE TO authenticated USING (true);

-- Create policies for employees
CREATE POLICY "Authenticated users can view employees" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert employees" ON public.employees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update employees" ON public.employees FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete employees" ON public.employees FOR DELETE TO authenticated USING (true);

-- Create policies for locations
CREATE POLICY "Authenticated users can view locations" ON public.locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert locations" ON public.locations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update locations" ON public.locations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete locations" ON public.locations FOR DELETE TO authenticated USING (true);

-- Create policies for gates
CREATE POLICY "Authenticated users can view gates" ON public.gates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert gates" ON public.gates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update gates" ON public.gates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete gates" ON public.gates FOR DELETE TO authenticated USING (true);

-- Create policies for visitors
CREATE POLICY "Authenticated users can view visitors" ON public.visitors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert visitors" ON public.visitors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update visitors" ON public.visitors FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete visitors" ON public.visitors FOR DELETE TO authenticated USING (true);

-- Create policies for appointments
CREATE POLICY "Authenticated users can view appointments" ON public.appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert appointments" ON public.appointments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update appointments" ON public.appointments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete appointments" ON public.appointments FOR DELETE TO authenticated USING (true);

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_gates_updated_at BEFORE UPDATE ON public.gates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_visitors_updated_at BEFORE UPDATE ON public.visitors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate visitor ID
CREATE OR REPLACE FUNCTION public.generate_visitor_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.visitor_id = 'VIS-' || UPPER(SUBSTRING(MD5(gen_random_uuid()::text) FOR 8)) || '-' || UPPER(SUBSTRING(MD5(gen_random_uuid()::text) FOR 4));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for visitor ID generation
CREATE TRIGGER generate_visitor_id_trigger BEFORE INSERT ON public.visitors FOR EACH ROW EXECUTE FUNCTION public.generate_visitor_id();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();