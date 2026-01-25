/**
 * Haptic feedback utilities for mobile devices
 * Uses the Vibration API where available
 */

export type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const hapticPatterns: Record<HapticFeedbackType, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 50, 10],
  warning: [20, 50, 20],
  error: [30, 50, 30, 50, 30],
};

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Trigger haptic feedback
 */
export function triggerHaptic(type: HapticFeedbackType = 'medium'): void {
  if (!isHapticSupported()) return;
  
  try {
    const pattern = hapticPatterns[type];
    navigator.vibrate(pattern);
  } catch (error) {
    // Silently fail if vibration is not allowed
    console.debug('Haptic feedback not available:', error);
  }
}

/**
 * Trigger haptic feedback for pull-to-refresh threshold reached
 */
export function triggerRefreshHaptic(): void {
  triggerHaptic('medium');
}

/**
 * Trigger haptic feedback for successful action
 */
export function triggerSuccessHaptic(): void {
  triggerHaptic('success');
}

/**
 * Trigger haptic feedback for swipe action
 */
export function triggerSwipeHaptic(): void {
  triggerHaptic('light');
}
