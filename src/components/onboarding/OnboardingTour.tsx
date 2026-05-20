import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  CalendarDays, 
  Shield, 
  ChevronRight, 
  ChevronLeft,
  X,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

interface OnboardingStep {
  id: number;
  icon: React.ElementType;
  title: string;
  description: string;
  highlight: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 1,
    icon: LayoutDashboard,
    title: 'Welcome to Re Sustainability',
    description: 'Your enterprise visitor management system. Get a real-time overview of all visitor activity, gate status, and key metrics from your dashboard.',
    highlight: 'Dashboard',
  },
  {
    id: 2,
    icon: UserPlus,
    title: 'Register New Visitors',
    description: 'Quickly register visitors with all their details including host information, purpose of visit, and laptop details for security compliance.',
    highlight: 'New Visitor',
  },
  {
    id: 3,
    icon: Users,
    title: 'Manage Check-ins',
    description: 'Use the Check-in/Out page to scan QR codes or search for visitors. Track who\'s on-site in real-time with instant status updates.',
    highlight: 'Check-in/Out',
  },
  {
    id: 4,
    icon: CalendarDays,
    title: 'Schedule Appointments',
    description: 'Pre-register visitors for scheduled meetings. They\'ll receive confirmation and can check in faster when they arrive.',
    highlight: 'Appointments',
  },
  {
    id: 5,
    icon: Shield,
    title: 'Security & Compliance',
    description: 'Print visitor badges, track laptop registrations, and generate detailed reports for security audits and compliance.',
    highlight: 'Reports',
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingTour({ onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in on mount
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  const step = onboardingSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === onboardingSteps.length - 1;

  const goToStep = (newStep: number, dir: 'next' | 'prev') => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection(dir);
    
    setTimeout(() => {
      setCurrentStep(newStep);
      setIsAnimating(false);
    }, 200);
  };

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      goToStep(currentStep + 1, 'next');
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      goToStep(currentStep - 1, 'prev');
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(onComplete, 300);
  };

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(onSkip, 300);
  };

  const StepIcon = step.icon;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-foreground/60 backdrop-blur-sm"
        onClick={handleSkip}
      />
      
      {/* Modal */}
      <div 
        className={`relative w-full max-w-lg mx-4 bg-card rounded-2xl shadow-2xl border overflow-hidden transition-all duration-300 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Step {currentStep + 1} of {onboardingSteps.length}</span>
          </div>

          {/* Animated content */}
          <div 
            className={`transition-all duration-200 ${
              isAnimating 
                ? direction === 'next' 
                  ? 'opacity-0 -translate-x-4' 
                  : 'opacity-0 translate-x-4'
                : 'opacity-100 translate-x-0'
            }`}
          >
            {/* Icon */}
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
                <StepIcon className="w-8 h-8 text-primary" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-foreground mb-3">
              {step.title}
            </h2>

            {/* Description */}
            <p className="text-muted-foreground leading-relaxed mb-6">
              {step.description}
            </p>

            {/* Highlight badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent rounded-full text-sm">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="text-accent-foreground font-medium">{step.highlight}</span>
            </div>
          </div>
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-2 pb-4">
          {onboardingSteps.map((_, index) => (
            <button
              key={index}
              onClick={() => goToStep(index, index > currentStep ? 'next' : 'prev')}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentStep 
                  ? 'bg-primary w-6' 
                  : index < currentStep 
                    ? 'bg-primary/50' 
                    : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-6 pt-2 border-t bg-muted/30">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={isFirstStep}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
          
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Skip tour
            </Button>
            <Button onClick={handleNext} className="gap-2 min-w-[120px]">
              {isLastStep ? (
                <>
                  Get Started
                  <CheckCircle2 className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
