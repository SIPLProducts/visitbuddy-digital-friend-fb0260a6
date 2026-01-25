import { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void> | void;
  disabled?: boolean;
  className?: string;
}

export function PullToRefresh({
  children,
  onRefresh,
  disabled = false,
  className,
}: PullToRefreshProps) {
  const { isRefreshing, pullDistance, isPulling } = usePullToRefresh({
    onRefresh,
    disabled,
  });

  const progress = Math.min(pullDistance / 80, 1);
  const shouldShow = isPulling || isRefreshing;

  return (
    <div className={cn('relative', className)}>
      {/* Pull indicator */}
      <div
        className={cn(
          'absolute left-1/2 -translate-x-1/2 z-10 flex items-center justify-center transition-all duration-200',
          shouldShow ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        style={{
          top: isRefreshing ? 16 : Math.max(pullDistance - 40, 8),
        }}
      >
        <div
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-full bg-card border border-border shadow-lg',
            isRefreshing && 'animate-pulse'
          )}
        >
          <RefreshCw
            className={cn(
              'h-5 w-5 text-primary transition-transform',
              isRefreshing && 'animate-spin'
            )}
            style={{
              transform: isRefreshing
                ? undefined
                : `rotate(${progress * 360}deg)`,
            }}
          />
        </div>
      </div>

      {/* Content with transform during pull */}
      <div
        style={{
          transform: isPulling ? `translateY(${pullDistance * 0.3}px)` : undefined,
          transition: isPulling ? undefined : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}