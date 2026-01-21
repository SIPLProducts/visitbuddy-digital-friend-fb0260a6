import { Gate, Location } from './database';

export type VehicleStatus = 'registered' | 'checked_in' | 'checked_out';

export interface Vehicle {
  id: string;
  vehicle_id: string;
  vehicle_number: string;
  vehicle_type: string;
  driver_name: string;
  driver_phone: string | null;
  company: string | null;
  purpose: string | null;
  status: VehicleStatus;
  check_in_time: string | null;
  check_out_time: string | null;
  gate_id: string | null;
  location_id: string | null;
  qr_code: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  gate?: Gate;
  location?: Location;
}
