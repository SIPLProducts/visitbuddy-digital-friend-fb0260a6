## Goal
Replace the brand name "VisiGuard" with "Resustainability" in two places only:
1. Login page (Auth)
2. Top-left sidebar shown after login

## Changes

**src/pages/Auth.tsx**
- Line 119: mobile login header → "Resustainability"
- Line 166: desktop login header → "Resustainability"
- Line 179: tagline "Get started with VisiGuard today" → "Get started with Resustainability today"

**src/components/layout/Sidebar.tsx**
- Line 162: sidebar brand text → "Resustainability"

## Out of scope (not changed)
All other VisiGuard references remain untouched: proposal docs, user manual, install page, help, settings placeholder, self-service header, onboarding tour, badge printing, tenant_settings DB default, etc. If you want any of those updated too, let me know.
