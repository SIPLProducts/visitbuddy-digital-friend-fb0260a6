import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useSwipeActions } from '@/hooks/useSwipeActions';
import { useIsMobile } from '@/hooks/use-mobile';

interface SwipeAction {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}

interface SwipeableCardProps {
  children: ReactNode;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  className?: string;
  disabled?: boolean;
}

export function SwipeableCard({
  children,
  leftAction,
  rightAction,
  className,
  disabled = false,
}: SwipeableCardProps) {
  const isMobile = useIsMobile();
  
  const {
    offset,
    isSwiping,
    isRevealed,
    revealedSide,
    handlers,
    reset,
    executeAction,
  } = useSwipeActions({
    onSwipeLeft: rightAction ? () => {} : undefined,
    onSwipeRight: leftAction ? () => {} : undefined,
    disabled: disabled || !isMobile,
  });

  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Left action (revealed when swiping right) */}
      {leftAction && (
        <div
          className={cn(
            'absolute inset-y-0 left-0 flex items-center justify-center transition-opacity',
            offset > 0 || revealedSide === 'right' ? 'opacity-100' : 'opacity-0 pointer-events-none',
            leftAction.className
          )}
          style={{ width: Math.abs(offset) || 80 }}
          onClick={() => {
            leftAction.onClick();
            reset();
          }}
        >
          <div className="flex flex-col items-center gap-1 text-white">
            {leftAction.icon}
            <span className="text-xs font-medium">{leftAction.label}</span>
          </div>
        </div>
      )}

      {/* Right action (revealed when swiping left) */}
      {rightAction && (
        <div
          className={cn(
            'absolute inset-y-0 right-0 flex items-center justify-center transition-opacity',
            offset < 0 || revealedSide === 'left' ? 'opacity-100' : 'opacity-0 pointer-events-none',
            rightAction.className
          )}
          style={{ width: Math.abs(offset) || 80 }}
          onClick={() => {
            rightAction.onClick();
            reset();
          }}
        >
          <div className="flex flex-col items-center gap-1 text-white">
            {rightAction.icon}
            <span className="text-xs font-medium">{rightAction.label}</span>
          </div>
        </div>
      )}

      {/* Main content */}
      <div
        {...handlers}
        className={cn(
          'relative bg-card transition-transform',
          !isSwiping && 'duration-200 ease-out'
        )}
        style={{
          transform: `translateX(${offset}px)`,
        }}
        onClick={(e) => {
          if (isRevealed) {
            e.stopPropagation();
            reset();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
