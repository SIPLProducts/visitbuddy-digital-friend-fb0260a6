import { ReactNode, useState } from 'react';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileBottomNav } from './MobileBottomNav';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  useSessionTimeout(30);

  return (
    <div className="flex h-screen overflow-hidden bg-background w-full">
      <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className={`flex-1 overflow-y-auto p-4 md:p-6 ${isMobile ? 'pb-20' : ''}`}>
          {children}
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
      
      {/* Onboarding Tour */}
      {showOnboarding && (
        <OnboardingTour 
          onComplete={completeOnboarding} 
          onSkip={completeOnboarding} 
        />
      )}
    </div>
  );
}