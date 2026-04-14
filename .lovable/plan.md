

# Fix Page Disappearing on Navigation

## Problem
When clicking a sidebar link, the current page fades out completely (`exit` animation with `mode="wait"`) before the new page fades in. This causes a visible blank/disappearing screen between navigations.

## Root Cause
`AnimatePresence mode="wait"` forces the old page to fully exit (fade out + move up) before the new page enters. Combined with a 0.3s duration, this creates a noticeable blank flash.

Additionally, the `MainLayout` itself has a `motion.main` wrapper with its own fade animation, creating a double-animation effect.

## Fix

### 1. Change PageTransition to eliminate the blank gap
- Remove `mode="wait"` (use default `mode="sync"` so new page enters immediately as old exits)
- Reduce animation duration from 0.3s to 0.15s
- Remove the `exit` animation entirely — just fade in the new page
- Remove the `y` offset to avoid visual jumping

### 2. Remove duplicate animation in MainLayout
- Change the `motion.main` in `MainLayout.tsx` to a plain `main` element since `PageTransition` already handles the animation

**Result**: Pages will transition instantly with a subtle fade-in instead of disappearing and reappearing.

