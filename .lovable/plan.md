

# Add Smooth Page Transitions with Framer Motion

## Overview
Add fade + slide animations on every route change for a polished, app-like feel.

## Changes

### 1. Install framer-motion
Add `framer-motion` package dependency.

### 2. Create PageTransition wrapper (`src/components/layout/PageTransition.tsx`)
- Wrap children in `motion.div` with `AnimatePresence`
- Animation: fade-in + subtle upward slide (opacity 0→1, y: 8→0), duration ~0.3s
- Use `useLocation().pathname` as the `key` for `AnimatePresence`

### 3. Update App.tsx
- Import `PageTransition` and wrap the `<Routes>` block inside it
- Use `useLocation()` to pass the location key for route-aware transitions

### 4. Update MainLayout.tsx
- Wrap the `{children}` content area in a `motion.div` with a subtle fade-in so dashboard/page content animates smoothly within the layout frame (sidebar/header stay static)

## Files
1. `package.json` — add framer-motion
2. `src/components/layout/PageTransition.tsx` — new component
3. `src/App.tsx` — wrap Routes with AnimatePresence + PageTransition
4. `src/components/layout/MainLayout.tsx` — animate main content area

