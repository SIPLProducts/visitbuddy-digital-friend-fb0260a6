
-- Add camera fields to gates table
ALTER TABLE public.gates
ADD COLUMN camera_url text DEFAULT NULL,
ADD COLUMN camera_type text DEFAULT 'snapshot',
ADD COLUMN camera_enabled boolean DEFAULT false;

-- Create anpr_events table
CREATE TABLE public.anpr_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number text NOT NULL,
  gate_id uuid REFERENCES public.gates(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  image_url text,
  matched_vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  match_status text NOT NULL DEFAULT 'unmatched',
  event_time timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.anpr_events ENABLE ROW LEVEL SECURITY;

-- RLS: Authenticated users can view ANPR events at their locations
CREATE POLICY "Users can view anpr events at their locations"
ON public.anpr_events FOR SELECT TO authenticated
USING (
  is_ho_admin(auth.uid())
  OR location_id IN (SELECT get_user_location_ids(auth.uid()))
  OR location_id IS NULL
);

-- RLS: Allow anon inserts (webhook from camera)
CREATE POLICY "Anon can insert anpr events"
ON public.anpr_events FOR INSERT TO anon
WITH CHECK (true);

-- RLS: Allow authenticated inserts
CREATE POLICY "Authenticated can insert anpr events"
ON public.anpr_events FOR INSERT TO authenticated
WITH CHECK (true);

-- Enable realtime for anpr_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.anpr_events;
