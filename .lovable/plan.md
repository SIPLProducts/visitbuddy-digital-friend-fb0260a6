## Lighten Visitor Table Header Color

### Objective
Make the sticky table header on the Visitors screen lighter than the current dark sidebar color.

### Changes

**File:** `src/pages/Visitors.tsx` (line 597–598)

**Current:**
```tsx
<TableHeader className="sticky top-0 z-10 bg-sidebar [&_tr]:border-sidebar-border [&_th]:text-sidebar-foreground">
  <TableRow className="hover:bg-sidebar">
```

**Proposed:**
```tsx
<TableHeader className="sticky top-0 z-10 bg-primary [&_tr]:border-primary/20 [&_th]:text-primary-foreground">
  <TableRow className="hover:bg-primary/90">
```

### Rationale
- The current `bg-sidebar` token (`hsl(245 40% 10%)`) is very dark — nearly black.
- Switching to `bg-primary` (`hsl(239 84% 67%)`) uses the existing brand indigo token, making the header significantly lighter and more visually appealing.
- Text color switches to `text-primary-foreground` (white) to maintain readability.
- Border and hover states are updated to translucent primary variants to stay consistent.
- No new design tokens or business logic needed — fully within the existing semantic system.