# Visitor Privacy Notice Presentation Update

## User-facing changes
- In the existing third required radio choice, show the service-provider authorization sentence exactly as provided.
- Present “Privacy Policy & Terms” as a distinct label, followed by “I have read and accept the Privacy Policy of ReSL and Terms of Service.” Keep the named policies clickable at the supplied URLs and show “(Accept)” as requested.
- Reduce the privacy-notice box height while retaining its scrollable content and current overall layout.

## Technical details
- Update only the shared privacy notice presentation used by both visitor registration flows.
- Preserve the current single-radio selection, required-acknowledgement rules, signature gating, links, and submission behavior; make no database, server, or unrelated changes.
- Verify the rendered text and compact notice box on the preview, including narrow-screen wrapping.
