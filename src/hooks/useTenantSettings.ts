import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TenantSettings {
  id: string;
  company_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  badge_logo_url: string | null;
  badge_footer_text: string;
  email_header_text: string;
  email_footer_text: string;
  nda_text: string;
  session_timeout_minutes: number;
  data_retention_days: number;
  auto_checkout_hours: number;
  enable_nda: boolean;
  enable_photo_capture: boolean;
  enable_watchlist_check: boolean;
  checkout_warning_hour: number;
  security_contact_number: string | null;
}

const defaults: TenantSettings = {
  id: '',
  company_name: 'VisiGuard',
  logo_url: null,
  primary_color: '#0ea5e9',
  secondary_color: '#10b981',
  badge_logo_url: null,
  badge_footer_text: 'Thank you for visiting',
  email_header_text: 'Welcome to our facility',
  email_footer_text: 'This is an automated message',
  nda_text: 'I agree to comply with all facility security policies and procedures.',
  session_timeout_minutes: 30,
  data_retention_days: 90,
  auto_checkout_hours: 12,
  enable_nda: true,
  enable_photo_capture: true,
  enable_watchlist_check: true,
  checkout_warning_hour: 18,
};

export function useTenantSettings() {
  const [settings, setSettings] = useState<TenantSettings>(defaults);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    const { data } = await supabase.from('tenant_settings').select('*').limit(1).single();
    if (data) setSettings(data as any);
    setLoading(false);
  };

  const updateSettings = async (updates: Partial<TenantSettings>) => {
    const { error } = await supabase.from('tenant_settings').update(updates as any).eq('id', settings.id);
    if (!error) {
      setSettings(prev => ({ ...prev, ...updates }));
      return true;
    }
    return false;
  };

  useEffect(() => { fetchSettings(); }, []);

  return { settings, loading, updateSettings, refetch: fetchSettings };
}
