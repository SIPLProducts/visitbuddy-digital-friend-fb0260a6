## Issue

The page title shown in the tab/title bar comes from `<title>` in `index.html` (already "Re Sustainability"), but the PWA manifest defined in `vite.config.ts` still says **"VisiGuard VMS"** / **"VisiGuard"**. When the app is installed as a PWA or when devices render the manifest name (Android install prompts, app switcher, opened-from-QR PWA shell), the user sees "VisiGuard VMS" instead of "Re Sustainability".

Additionally, the in-DB tenant setting `tenant_settings.company_name` is `"VisiGuard"` — this drives any UI that uses `useTenantSettings().company_name`.

## Change

1. **`vite.config.ts`** — update the PWA manifest:
   - `name: "Re Sustainability - Visitor Management"`
   - `short_name: "Re Sustainability"`
   - `description: "Re Sustainability Visitor Management System - Check-in, badge printing, and visitor tracking"`

2. **Database** — one-line migration to update the tenant setting:
   ```sql
   update public.tenant_settings set company_name = 'Re Sustainability';
   ```

That's it — no other source of "VisiGuard VMS" reaches the browser title bar. The proposal/manual/resource doc pages (`Proposal*`, `ProductFeatures`, `UserManual`, `ResourceRequirements`, `generateProposalDocx`) still contain the literal "VisiGuard VMS" in their printable content, but those are separate downloadable marketing/manual artifacts and were not in scope of the title-bar issue. Out of scope unless you want me to rebrand those documents too.

## Note on cached PWA

If the app is already installed on the user's device, the OS may keep the old manifest name until the PWA is reinstalled or the service worker refreshes the manifest. After deploying, uninstall + reinstall the PWA to see the new name.
