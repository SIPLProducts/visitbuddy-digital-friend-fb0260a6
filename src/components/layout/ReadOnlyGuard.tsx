import { Navigate } from 'react-router-dom';
import { useUserRoles } from '@/hooks/useUserRoles';

/**
 * Wraps routes that should be inaccessible to read-only users (Admin Head).
 * Redirects to the provided fallback while roles are still loading we render nothing
 * to avoid an early flash of the protected page.
 */
export function ReadOnlyGuard({ to, children }: { to: string; children: React.ReactNode }) {
  const { isReadOnly, loading } = useUserRoles();
  if (loading) return null;
  if (isReadOnly) return <Navigate to={to} replace />;
  return <>{children}</>;
}