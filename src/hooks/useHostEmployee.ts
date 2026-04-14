import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useHostEmployee() {
  const { user } = useAuth();
  const [hostEmployeeId, setHostEmployeeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) {
      setHostEmployeeId(null);
      setLoading(false);
      return;
    }

    const fetchEmployee = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user.email!)
        .limit(1)
        .maybeSingle();

      setHostEmployeeId(data?.id || null);
      setLoading(false);
    };

    fetchEmployee();
  }, [user?.email]);

  return { hostEmployeeId, loading };
}
