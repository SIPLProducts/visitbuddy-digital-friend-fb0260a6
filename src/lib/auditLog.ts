import { supabase } from '@/integrations/supabase/client';

export type AuditAction = 
  | 'visitor_check_in' | 'visitor_check_out' | 'visitor_created' | 'visitor_updated' | 'visitor_deleted' | 'visitor_approved'
  | 'vehicle_check_in' | 'vehicle_check_out' | 'vehicle_created' | 'vehicle_updated' | 'vehicle_deleted'
  | 'appointment_created' | 'appointment_updated' | 'appointment_deleted' | 'appointment_confirmed'
  | 'employee_created' | 'employee_updated' | 'employee_deleted'
  | 'department_created' | 'department_updated' | 'department_deleted'
  | 'gate_created' | 'gate_updated' | 'gate_deleted'
  | 'location_created' | 'location_updated' | 'location_deleted'
  | 'user_created' | 'user_updated' | 'user_deleted' | 'user_role_changed'
  | 'badge_printed' | 'bulk_checkout' | 'bulk_approval'
  | 'watchlist_added' | 'watchlist_updated' | 'watchlist_removed'
  | 'settings_changed' | 'login' | 'logout';

export type EntityType = 
  | 'visitor' | 'vehicle' | 'appointment' | 'employee' | 'department' 
  | 'gate' | 'location' | 'user' | 'badge' | 'watchlist' | 'settings' | 'system';

interface LogParams {
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  entityName?: string;
  details?: Record<string, unknown>;
  locationId?: string;
}

export async function logAudit({ action, entityType, entityId, entityName, details, locationId }: LogParams) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('audit_logs').insert({
      user_id: user?.id || null,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      entity_name: entityName || null,
      details: details || {},
      location_id: locationId || null,
    } as any);
  } catch (e) {
    console.error('Audit log failed:', e);
  }
}
