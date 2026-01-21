-- Create vehicle_entries table to track multiple check-in/check-out events per vehicle
CREATE TABLE public.vehicle_entries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    gate_id UUID REFERENCES public.gates(id),
    location_id UUID REFERENCES public.locations(id),
    entry_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    exit_time TIMESTAMP WITH TIME ZONE,
    purpose TEXT,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_vehicle_entries_vehicle_id ON public.vehicle_entries(vehicle_id);
CREATE INDEX idx_vehicle_entries_entry_time ON public.vehicle_entries(entry_time DESC);
CREATE INDEX idx_vehicle_entries_location_id ON public.vehicle_entries(location_id);

-- Enable RLS
ALTER TABLE public.vehicle_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view vehicle entries at their locations"
ON public.vehicle_entries
FOR SELECT
USING (
    public.is_ho_admin(auth.uid()) OR 
    location_id IN (SELECT public.get_user_location_ids(auth.uid())) OR 
    location_id IS NULL
);

CREATE POLICY "Users can insert vehicle entries at their locations"
ON public.vehicle_entries
FOR INSERT
WITH CHECK (
    public.is_ho_admin(auth.uid()) OR 
    location_id IN (SELECT public.get_user_location_ids(auth.uid())) OR 
    location_id IS NULL
);

CREATE POLICY "Users can update vehicle entries at their locations"
ON public.vehicle_entries
FOR UPDATE
USING (
    public.is_ho_admin(auth.uid()) OR 
    location_id IN (SELECT public.get_user_location_ids(auth.uid())) OR 
    location_id IS NULL
);

CREATE POLICY "Managers and Admins can delete vehicle entries"
ON public.vehicle_entries
FOR DELETE
USING (
    public.is_ho_admin(auth.uid()) OR 
    location_id IN (
        SELECT location_id FROM public.user_location_roles 
        WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
);

-- Create trigger for updated_at
CREATE TRIGGER update_vehicle_entries_updated_at
BEFORE UPDATE ON public.vehicle_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for vehicle entries
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_entries;