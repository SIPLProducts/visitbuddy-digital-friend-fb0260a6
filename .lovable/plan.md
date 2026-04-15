

# Add Data Consent Text to Print Badge Bottom

## Summary
Add the full data consent/privacy text as a styled footer section at the bottom of each printed badge in `PrintBadge.tsx`, below the safety guidelines and above the "Powered by" footer. The text must be fully visible with no clipping.

## Consent Text
> I consent to the processing of my personal data for visiting purposes and confirm that the data shared is accurate and belongs to me. I understand that I can withdraw my consent at any time through written notice, and that such withdrawal may limit or affect the services offered.
>
> Resustainability seeks your consent to collect and process your personal data for visitor management, legal and compliance obligations, and lawful, specified needs. Data will be retained as per applicable regulations. Adequate safeguards are in place to prevent misuse or unauthorized access, and data will be deleted after 30 days.
>
> Data will not be shared to any 3rd parties.

## Changes

### `src/pages/PrintBadge.tsx`

1. **Add CSS class** `.consent-text` — small font (~8px), gray text, top border, padding, with `page-break-inside: avoid` to prevent content being cut across pages during print.

2. **Add HTML block** — Insert a new `<div className="consent-text">` after the `.guidelines` section (line 615) and before the badge wrapper closing tag (line 616). Contains all three paragraphs of the consent text.

3. **Also update `SafetyPermitBadge.tsx`** — Add the same consent text block after the safety guidelines section for consistency when the component is used elsewhere.

## Files Changed
- `src/pages/PrintBadge.tsx` — Add consent footer section + CSS
- `src/components/badge/SafetyPermitBadge.tsx` — Add matching consent text block

