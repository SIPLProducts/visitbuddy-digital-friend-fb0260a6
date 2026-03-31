

# Add Multi-Language (i18n) Support — English + Indian Languages

## Overview
Add internationalization with English as default and all major Indian languages in the dropdown. Language switcher in both the header (globe icon) and Settings page.

## Languages
- **English** (en) — default
- **Hindi** (hi) — हिन्दी
- **Tamil** (ta) — தமிழ்
- **Telugu** (te) — తెలుగు
- **Kannada** (kn) — ಕನ್ನಡ
- **Malayalam** (ml) — മലയാളം
- **Bengali** (bn) — বাংলা
- **Marathi** (mr) — मराठी
- **Gujarati** (gu) — ગુજરાતી
- **Punjabi** (pa) — ਪੰਜਾਬੀ
- **Odia** (or) — ଓଡ଼ିଆ
- **Assamese** (as) — অসমীয়া
- **Urdu** (ur) — اردو

## Changes

### 1. Install dependencies
- `react-i18next`, `i18next`, `i18next-browser-languagedetector`

### 2. Create i18n config (`src/i18n/index.ts`)
- Initialize i18next with browser language detector, localStorage key `visiguard_lang`, fallback to English

### 3. Create translation JSON files (`src/i18n/locales/`)
- One file per language (en.json, hi.json, ta.json, te.json, kn.json, ml.json, bn.json, mr.json, gu.json, pa.json, or.json, as.json, ur.json)
- Keys cover: sidebar nav labels, dashboard headings, common buttons (Save, Cancel, Search, Add, Delete), visitor form labels, table headers, settings tabs, notification messages

### 4. Import i18n in `src/main.tsx`
- Add `import './i18n'` before App render

### 5. Add Globe language switcher to Header (`src/components/layout/Header.tsx`)
- Globe icon dropdown showing all languages with native script names
- Changes language via `i18next.changeLanguage()`

### 6. Add Language dropdown in Settings (`src/pages/Settings.tsx`)
- Language selector in General tab

### 7. RTL support for Urdu
- Set `dir="rtl"` on `<html>` when Urdu is selected (in `src/App.tsx`)

### 8. Update key components with `useTranslation()`
- Sidebar nav labels, Header text, Dashboard headings, Visitors page, Settings page labels

## Files (18 total)
1. `package.json` — add i18n deps
2. `src/i18n/index.ts` — config
3. `src/i18n/locales/en.json` through `ur.json` — 13 translation files
4. `src/main.tsx` — import i18n
5. `src/components/layout/Header.tsx` — language switcher
6. `src/components/layout/Sidebar.tsx` — translated nav
7. `src/pages/Settings.tsx` — language dropdown
8. `src/pages/Dashboard.tsx` — translated labels
9. `src/pages/Visitors.tsx` — translated table/buttons
10. `src/App.tsx` — RTL handler for Urdu

