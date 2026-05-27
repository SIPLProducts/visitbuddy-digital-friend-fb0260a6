import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from './MainLayout';
import { PageTransition } from './PageTransition';
import { InstallPromptBanner } from '@/components/install/InstallPromptBanner';

export function ProtectedLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    // Last-resort guard: if someone hits "/?<shortlink>" and the pre-React
    // rewrite did not catch it, route them to the correct PUBLIC page
    // instead of sending them to the login screen.
    if (location.pathname === '/' && location.search.length > 1) {
      const raw = location.search.slice(1);
      if (!raw.includes('=') && !raw.includes('&')) {
        if (/^s[a-z0-9]{6}$/i.test(raw)) {
          return <Navigate to={`/safety/${raw.slice(1).toLowerCase()}`} replace />;
        }
        if (/^qr[a-z0-9-]+$/i.test(raw)) {
          return <Navigate to={`/visitor/${raw.slice(2).toUpperCase()}`} replace />;
        }
        if (/^[a-z0-9]{6,10}$/i.test(raw)) {
          return <Navigate to={`/s/${raw.toLowerCase()}`} replace />;
        }
        if (/^[a-z0-9-]{4,}$/i.test(raw)) {
          return <Navigate to={`/visitor/${raw.toUpperCase()}`} replace />;
        }
      }
    }
    return <Navigate to="/auth" replace />;
  }

  return (
    <MainLayout>
      <PageTransition locationKey={location.pathname}>
        <Outlet />
      </PageTransition>
      <InstallPromptBanner />
    </MainLayout>
  );
}
