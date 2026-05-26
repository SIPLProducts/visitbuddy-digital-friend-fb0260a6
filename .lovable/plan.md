Update the Visitors table so the header stays fixed while only the data rows scroll.

Plan:
1. Update the shared `Table` component to accept an optional `wrapperClassName` prop for styling the built-in table wrapper.
2. In `Visitors.tsx`, remove the extra outer scroll container around the table and move the max-height/overflow styling onto the actual `Table` wrapper.
3. Keep the visitor table header styled with the sidebar color and sticky positioning so it remains visible while scrolling rows.

Technical detail:
- The current issue is caused by nested scroll wrappers: the sticky header is inside the shadcn table wrapper, but the outer div is the one scrolling. Sticky positioning must be attached to the same container that scrolls.