# Combine the two privacy acknowledgements

## User-facing change
- In both staff and self-service visitor registration, replace the separate service-provider and Privacy Policy/Terms checkboxes with one required radio button.
- Keep the service-provider statement and the Privacy Policy/Terms statement together beside that control, preserving the clickable policy links.
- Leave the other two required declarations and the existing notice/signature experience unchanged.

## Behavior
- Selecting the radio button records both acknowledgements in the existing declaration state, so current completion validation and signature gating continue to work.
- Keep all acknowledgements initially unselected; the visitor must select the combined control before signing or continuing.
- No database, server function, or other business-logic changes.

## Technical details
- Update the shared declaration UI and its focused validation test only; use the existing radio-group design component and preserve the existing declaration IDs/payload shape.
