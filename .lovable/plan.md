

# Show Register Vehicle Form Inline on the Vehicles Page

Same pattern as the inline New Visitor form.

## Changes

### 1. Refactor `src/pages/NewVehicle.tsx`
- Accept optional `inline?: boolean` and `onClose?: () => void` props
- When `inline` is true: hide the back arrow/header, call `onClose()` instead of `navigate('/vehicles')` after successful submission
- When not inline: keep existing standalone behavior

### 2. Update `src/pages/Vehicles.tsx`
- Add `showNewVehicleForm` state
- Replace `navigate('/vehicles/new')` button (line 273) with `onClick={() => setShowNewVehicleForm(true)}`
- When `showNewVehicleForm` is true, render `<NewVehicle inline onClose={() => { setShowNewVehicleForm(false); fetchVehicles(); }} />` above the vehicle table in a card container
- Import `NewVehicle` component

## Files affected
- `src/pages/NewVehicle.tsx` — add inline/onClose props, conditional header/navigation
- `src/pages/Vehicles.tsx` — add state toggle, render inline form

