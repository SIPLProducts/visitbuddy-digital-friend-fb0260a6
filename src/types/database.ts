export type VisitorStatus = 'checked_in' | 'checked_out' | 'scheduled' | 'cancelled' | 'pending_approval';
export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type GateStatus = 'active' | 'inactive';
export type LocationStatus = 'active' | 'inactive';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  location_id: string | null;
  floor_number: string | null;
  building_section: string | null;
  employee_count: number;
  active_visitors: number;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  employee_id: string;
  name: string;
  email: string | null;
  position: string | null;
  department_id: string | null;
  location_id: string | null;
  is_host: boolean;
  created_at: string;
  updated_at: string;
  department?: Department;
  location?: Location;
}

export interface Location {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string;
  status: LocationStatus;
  gate_count: number;
  department_count: number;
  visitor_count: number;
  capacity_usage: number;
  email: string | null;
  phone: string | null;
  emergency_contact: string | null;
  assembly_point: string | null;
  latitude: number | null;
  longitude: number | null;
  geo_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface Gate {
  id: string;
  name: string;
  location_id: string | null;
  building: string | null;
  status: GateStatus;
  gate_type: string;
  has_qr: boolean;
  capacity: number;
  current_visitors: number;
  operating_hours: string;
  created_at: string;
  updated_at: string;
  location?: Location;
}

export interface Visitor {
  id: string;
  visitor_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  purpose: string | null;
  host_id: string | null;
  department_id: string | null;
  gate_id: string | null;
  laptop_brand: string | null;
  laptop_serial: string | null;
  has_laptop: boolean;
  has_mobile: boolean;
  mobile_brand: string | null;
  mobile_serial: string | null;
  vehicle_type: string | null;
  vehicle_number: string | null;
  status: VisitorStatus;
  check_in_time: string | null;
  check_out_time: string | null;
  badge_printed: boolean;
  qr_code: string | null;
  photo_url: string | null;
  accompanying_count: number | null;
  created_at: string;
  updated_at: string;
  host?: Employee;
  department?: Department;
  gate?: Gate;
}

export interface Appointment {
  id: string;
  visitor_name: string;
  visitor_email: string | null;
  visitor_phone: string | null;
  company: string | null;
  host_id: string | null;
  department_id: string | null;
  purpose: string | null;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: AppointmentStatus;
  has_teams_meeting: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  host?: Employee;
  department?: Department;
}

export interface AccompanyingVisitor {
  id: string;
  visitor_id: string;
  name: string;
  phone: string | null;
  has_laptop: boolean;
  laptop_brand: string | null;
  laptop_serial: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  user_id: string | null;
  created_at: string;
}

export interface DashboardStats {
  todaysVisitors: number;
  scheduledAppointments: number;
  activeCheckIns: number;
  avgVisitDuration: string;
  pendingApproval: number;
  overstayed: number;
}
