## Goal
Modify the Visitors table to have a scrollable body with a fixed header, and update the header styling to match the sidebar's dark indigo color.

## Changes

### 1. Table Layout — Scrollable Body + Fixed Header
- In `src/pages/Visitors.tsx`, restructure the table container to use a flex-column layout so the header stays fixed and only the body scrolls.
- Change the outer wrapper from `overflow-auto max-h-[calc(100vh-280px)]` to a flex column with a fixed height.
- Apply `flex flex-col` to the `<Table>` component via className at the usage site.
- Make `<TableHeader>` non-scrolling (`flex-shrink-0`).
- Wrap `<TableBody>` content in a scrollable container (`overflow-y-auto flex-1`).
- Ensure column alignment is preserved by using `table-layout: fixed` or consistent width classes.

### 2. Table Header Styling
- Update the `<TableHeader>` className from `sticky top-0 z-10 bg-card` to `bg-sidebar`.
- Update `<TableHead>` text color: change from `text-muted-foreground` to `text-sidebar-foreground` (or override via className on individual heads).
- Optionally add a subtle bottom border to separate header from body using `border-b border-sidebar-border`.

### 3. Token Safety
- Use semantic Tailwind tokens: `bg-sidebar`, `text-sidebar-foreground`, `border-sidebar-border` from the existing design system.
- Do not hardcode hex colors.

## Files to modify
- `src/pages/Visitors.tsx` — table container, Table className, TableHeader styling, TableHead text colors.

## Out of scope
- No changes to the shadcn Table primitive (`src/components/ui/table.tsx`) unless necessary.
- No backend or data logic changes.
- No other pages or components.