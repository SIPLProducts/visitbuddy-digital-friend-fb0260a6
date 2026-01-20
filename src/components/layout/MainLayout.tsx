import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { useOnboarding } from '@/hooks/useOnboarding';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { showOnboarding, completeOnboarding } = useOnboarding();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      
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
