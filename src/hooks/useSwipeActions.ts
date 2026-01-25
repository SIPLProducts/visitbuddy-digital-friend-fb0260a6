import { useState, useRef, useCallback } from 'react';
import { triggerSwipeHaptic, triggerSuccessHaptic } from '@/lib/haptics';
import { useIsMobile } from './use-mobile';

interface SwipeActionsOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  swipeThreshold?: number;
  disabled?: boolean;
}

interface SwipeState {
  offset: number;
  direction: 'left' | 'right' | null;
  isSwiping: boolean;
  isRevealed: boolean;
  revealedSide: 'left' | 'right' | null;
}

export function useSwipeActions({
  onSwipeLeft,
  onSwipeRight,
  swipeThreshold = 80,
  disabled = false,
}: SwipeActionsOptions = {}) {
  const isMobile = useIsMobile();
  const [state, setState] = useState<SwipeState>({
    offset: 0,
    direction: null,
    isSwiping: false,
    isRevealed: false,
    revealedSide: null,
  });
  
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const hasTriggeredHaptic = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || !isMobile) return;
    
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = null;
    hasTriggeredHaptic.current = false;
    
    setState(prev => ({ ...prev, isSwiping: true }));
  }, [disabled, isMobile]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || !isMobile || !state.isSwiping) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startX.current;
    const diffY = currentY - startY.current;

    // Determine if this is a horizontal or vertical swipe
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
        isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    // Only handle horizontal swipes
    if (!isHorizontalSwipe.current) return;

    // Prevent default to stop scrolling while swiping horizontally
    e.preventDefault();

    // Apply resistance
    const resistance = 0.6;
    const maxOffset = swipeThreshold * 1.5;
    let offset = diffX * resistance;
    
    // Limit the offset
    if (offset > maxOffset) offset = maxOffset;
    if (offset < -maxOffset) offset = -maxOffset;

    // Check if we've crossed the threshold and trigger haptic
    if (Math.abs(offset) >= swipeThreshold && !hasTriggeredHaptic.current) {
      triggerSwipeHaptic();
      hasTriggeredHaptic.current = true;
    }

    const direction = offset > 0 ? 'right' : offset < 0 ? 'left' : null;
    
    setState(prev => ({
      ...prev,
      offset,
      direction,
    }));
  }, [disabled, isMobile, state.isSwiping, swipeThreshold]);

  const handleTouchEnd = useCallback(() => {
    if (disabled || !isMobile) return;

    const { offset, direction } = state;
    
    // Check if swipe exceeded threshold
    if (Math.abs(offset) >= swipeThreshold) {
      if (direction === 'left' && onSwipeLeft) {
        triggerSuccessHaptic();
        // Reveal the right actions
        setState(prev => ({
          ...prev,
          offset: -swipeThreshold,
          isSwiping: false,
          isRevealed: true,
          revealedSide: 'left',
        }));
        return;
      } else if (direction === 'right' && onSwipeRight) {
        triggerSuccessHaptic();
        // Reveal the left actions
        setState(prev => ({
          ...prev,
          offset: swipeThreshold,
          isSwiping: false,
          isRevealed: true,
          revealedSide: 'right',
        }));
        return;
      }
    }

    // Reset position
    setState({
      offset: 0,
      direction: null,
      isSwiping: false,
      isRevealed: false,
      revealedSide: null,
    });
  }, [disabled, isMobile, state, swipeThreshold, onSwipeLeft, onSwipeRight]);

  const reset = useCallback(() => {
    setState({
      offset: 0,
      direction: null,
      isSwiping: false,
      isRevealed: false,
      revealedSide: null,
    });
  }, []);

  const executeAction = useCallback((side: 'left' | 'right') => {
    if (side === 'left' && onSwipeLeft) {
      triggerSuccessHaptic();
      onSwipeLeft();
    } else if (side === 'right' && onSwipeRight) {
      triggerSuccessHaptic();
      onSwipeRight();
    }
    reset();
  }, [onSwipeLeft, onSwipeRight, reset]);

  return {
    ...state,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    reset,
    executeAction,
  };
}
