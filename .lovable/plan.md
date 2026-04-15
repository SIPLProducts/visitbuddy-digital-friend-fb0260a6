

# Remove Demo Accounts from Login Page

## Changes

### `src/pages/Auth.tsx`
1. **Delete the `demoUsers` array** (lines 41–102)
2. **Delete the `handleDemoLogin` function** (lines 160–163)
3. **Delete the Demo Users Section JSX** (lines 246–272)
4. **Clean up unused imports** — remove `Crown`, `Building2`, `Users`, `UserCheck`, `ShieldCheck`, `User` from lucide-react if no longer used elsewhere in the file

## Files Changed
- `src/pages/Auth.tsx`

