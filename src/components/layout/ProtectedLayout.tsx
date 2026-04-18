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
