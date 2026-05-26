Change the Visitors table header from the dark sidebar color to a light color scheme.

In `src/pages/Visitors.tsx`, update the sticky `TableHeader` classes:
- Replace `bg-sidebar [&_tr]:border-sidebar-border [&_th]:text-sidebar-foreground` with a light style: `bg-muted/60 [&_tr]:border-border [&_th]:text-foreground`
- Update the `TableRow` hover from `hover:bg-sidebar` to `hover:bg-muted/60`
- Update the checkbox `TableHead`'s explicit `text-sidebar-foreground` to `text-foreground`

This gives the header a clean light-gray background with dark readable text, matching the rest of the app's light surfaces.