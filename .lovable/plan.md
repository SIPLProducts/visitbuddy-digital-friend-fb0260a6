# Make Host Field Mandatory in New Visitor Visit Details Card

## Goal
In the Visitors → New Visitor (Pre-Register Visitor) screen, the **Host** field inside the **Visit Details** card must be mandatory. All existing design, logic, functionality, and behaviour of the form must remain unchanged.

## Current State
- `src/pages/NewVisitor.tsx` defines the `visitorSchema` with `host_id: z.string().optional()`.
- The Host combobox uses `HostCombobox` from `src/components/visitors/HostCombobox.tsx` but is not registered with `react-hook-form`, so validation errors are not surfaced under the field.
- The Submit button already conditionally calls `notify-host` only when `data.host_id` is present; making it mandatory does not break that path.

## Changes

### 1. Schema validation
- In `src/pages/NewVisitor.tsx`, change `host_id: z.string().optional()` to `host_id: z.string().min(1, 'Please select a host')`.
- The inferred `VisitorFormData` type remains compatible because the default value is already an empty string.

### 2. UI label
- Update the Host label in the Visit Details card from `<Label>Host</Label>` to `<Label>Host *</Label>` to match the existing required-field pattern used elsewhere (e.g., Gate, Mode of Transport).

### 3. Validation error display
- Add a validation error paragraph below the Host combobox that reads `form.formState.errors.host_id?.message`, identical in style to the existing Gate error message.
- To ensure the field is validated, keep the existing `HostCombobox` usage but add `shouldValidate: true` when `setValue` is called on host selection/clear, or wrap it with `form.register` semantics. The simplest, minimal change is to keep the existing combobox handlers and add `shouldValidate: true` on `setValue` calls so the Zod rule is checked when the user interacts with the field.

### 4. Default values and reset
- Default value for `host_id` is already `''` and is reset to `''` on location change. No change needed there.

### 5. No other changes
- Department auto-fill behaviour, host notification flow, inline/standard mode, accompanying persons, vehicle/device fields, and the rest of the UI remain untouched.

## Validation
- After the change, attempting to submit without selecting a host must show the error message and prevent submission.
- Selecting a host must clear the error and allow submission to proceed exactly as before.
