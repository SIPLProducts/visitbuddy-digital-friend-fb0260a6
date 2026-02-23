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
  driver_license: string | null;
  department_id: string | null;
  is_employee_vehicle: boolean;
  employee_id: string | null;
  auto_allow: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  gate?: Gate;
  location?: Location;
  department?: { id: string; name: string };
  employee?: { id: string; name: string };
  // Entry count for display
  entry_count?: number;
  active_entry?: VehicleEntry | null;
}

export interface VehicleEntry {
  id: string;
  vehicle_id: string;
  gate_id: string | null;
  location_id: string | null;
  entry_time: string;
  exit_time: string | null;
  purpose: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  vehicle?: Vehicle;
  gate?: Gate;
  location?: Location;
}
