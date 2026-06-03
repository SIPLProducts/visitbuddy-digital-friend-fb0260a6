## Problem

On the Gates screen, typing in any field of the Add/Edit Gate dialog loses focus after every keystroke, forcing the user to re-click the field for each character.

## Root cause

In `src/pages/Gates.tsx`, the form is defined as a nested component `GateForm` **inside** the `Gates` component:

```tsx
const GateForm = () => ( ... <Input ... /> ... );
```

Every time `formData` state changes (i.e. every keystroke), `Gates` re-renders, which creates a brand-new `GateForm` function reference. React sees a different component type at that position and unmounts/remounts the entire form subtree, including the `<Input>` that currently has focus. That is why the cursor jumps out after each character.

## Fix

Stop treating the form as a nested component. Inline the form JSX directly inside both the Add dialog and the Edit dialog (or assign it to a plain `const gateFormContent = (...)` JSX expression evaluated during render, not a component). Keep all existing fields, layout, labels, placeholders, validation, and handlers exactly as they are — purely a structural refactor, no behavior change.

Specifically:
- Remove the `const GateForm = () => (...)` definition.
- Render the same JSX inline inside the Add Gate `<DialogContent>` and the Edit Gate `<DialogContent>` (extracted once into a local `const` JSX variable to avoid duplication).

This preserves DOM identity for the inputs across re-renders, so the cursor stays in place while typing.

## Scope

- File: `src/pages/Gates.tsx` only.
- No changes to data flow, Supabase calls, validation, CSV import, styles, or other pages.
