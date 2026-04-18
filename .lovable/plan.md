
The badge currently renders the logo on a red header band (`bg-red-600`) and applies `brightness-0 invert` to force the logo white. User wants the logo on a white background instead — applying to print, PDF, and all pages.

Need to check where the badge is used: SafetyPermitBadge.tsx is the single component, used in PrintBadge.tsx and likely email/badge contexts. The change is purely in the component header, so it applies everywhere automatically.

## Plan

Update `src/components/badge/SafetyPermitBadge.tsx` header section:

1. **Change header background** from `bg-red-600` to `bg-white` (with a bottom border so the header still feels framed against the rest of the badge).
2. **Remove `brightness-0 invert`** from the logo `<img>` so the original red "re" mark renders in its true colors on the white background.
3. **Change company name text color** from `text-white` to a dark color (e.g. `text-gray-800`) so it's readable on white.
4. **Add print color preservation**: include `print:bg-white` and inline `style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}` on the header so browsers don't drop the white background or alter logo colors during print/PDF export.

That's the only change needed. Since `SafetyPermitBadge` is the single source rendered by PrintBadge and any badge dialogs, this fix automatically covers all pages, print preview, and PDF export.
