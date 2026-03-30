import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function useSessionTimeout(timeoutMinutes: number = 30) {
  const { signOut, user } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const warningRef = useRef<ReturnType<typeof setTimeout>>();

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    if (!user || timeoutMinutes <= 0) return;

    const ms = timeoutMinutes * 60 * 1000;
    
    // Show warning 2 min before
    warningRef.current = setTimeout(() => {
      toast.warning('Your session will expire in 2 minutes due to inactivity.', { duration: 10000 });
    }, ms - 120000);

    timerRef.current = setTimeout(() => {
      toast.info('Session expired due to inactivity.');
      signOut();
    }, ms);
  }, [user, timeoutMinutes, signOut]);

  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    const handler = () => resetTimer();
    
    events.forEach(e => document.addEventListener(e, handler, { passive: true }));
    resetTimer();

    return () => {
      events.forEach(e => document.removeEventListener(e, handler));
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [user, resetTimer]);
}
