

# Fix Scroll in Visitor Details Dialog

## Problem
The `ScrollArea` component is already present but the scroll isn't working properly because the Radix ScrollArea viewport needs proper height constraints to activate scrolling within a flex container.

## Fix

### `src/components/visitors/VisitorDetailsDialog.tsx`

Change the `ScrollArea` wrapper to use `overflow-y-auto` directly instead of relying on Radix's internal overflow handling, and ensure the height constraint is applied correctly:

```tsx
// Replace:
<ScrollArea className="flex-1 max-h-[70vh] pr-4">

// With:
<div className="flex-1 overflow-y-auto max-h-[70vh] pr-2">
```

And close with `</div>` instead of `</ScrollArea>`. This ensures native browser scrollbar works reliably inside the flex dialog container.

Alternatively, keep `ScrollArea` but add `h-[70vh]` (fixed height instead of max-height) to force the scroll container to activate.

## Files Changed
- `src/components/visitors/VisitorDetailsDialog.tsx` — Fix scrollable container for visitor details

