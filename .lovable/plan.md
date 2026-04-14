
Fix the sidebar flash by making the app shell persistent instead of re-mounting on every route change.

## What’s actually causing the flash
The earlier transition change reduced the blank screen, but the sidebar can still flash because of two structural issues:

1. `PageTransition` currently wraps the entire `Routes` tree in `src/App.tsx`, so the whole screen fades on every navigation.
2. Each protected page renders its own `<MainLayout>`, so the sidebar/header are unmounted and mounted again on every page click.

That means the sidebar is not staying “fixed”; it is being recreated.

## Implementation plan

### 1. Create one persistent protected layout
Refactor routing in `src/App.tsx` to use a shared protected layout route with `Outlet`.

Target structure:
```text
BrowserRouter
└─ Routes
   ├─ public routes
   └─ protected layout route
      └─ MainLayout
         └─ PageTransition
            └─ Outlet (current page content only)
```

Result:
- Sidebar/Header/Mobile nav mount once
- Only the inner page content changes

### 2. Move the animation to page content only
Keep `PageTransition`, but use it around the routed page content inside the persistent layout instead of around the full `Routes` tree.

Also remove the route-level remount trigger in `App.tsx` (`key={location.pathname}` on `Routes`) so navigation doesn’t rebuild the full shell.

### 3. Convert protected pages to content-only pages
Update all protected pages that currently return:
- `<MainLayout> ...page content... </MainLayout>`

So they return only their inner content.

This affects the protected pages such as:
- Dashboard
- Visitors / New Visitor
- Appointments
- Check In/Out
- Badge Printing
- Reports
- Departments / Employees / Locations / Gates
- Analytics
- Settings
- Users
- Vehicles / Vehicle Types / Vehicle Report / Vehicle Gate
- Notifications / Audit Logs / Watchlist / Emergency / Camera Monitor
- other authenticated pages using `MainLayout`

### 4. Keep public/full-screen routes unchanged
Routes like these should remain outside the shared shell:
- `/auth`
- `/print-badge`
- `/self-service`
- `/approve-visitor`
- `/install`
- proposal/manual/document-style routes that intentionally don’t use the app shell

### 5. Small sidebar polish
In `Sidebar.tsx`, add a pathname-change close behavior for mobile drawer if needed, so the sheet never lingers during navigation.

## Files to update
- `src/App.tsx`
- `src/components/layout/MainLayout.tsx`
- `src/components/layout/PageTransition.tsx`
- `src/components/layout/Sidebar.tsx` (minor polish)
- protected page files currently importing/using `MainLayout`

## Expected result
After this refactor:
- sidebar no longer flashes on page click
- header/sidebar stay visually stable
- only the main content area transitions
- navigation feels much smoother on desktop and mobile

## QA to run after implementation
- Click multiple sidebar links quickly on desktop and confirm sidebar/header never fade or blink
- Test mobile drawer navigation and confirm it closes cleanly
- Verify public routes still render without the app shell
- Check scroll behavior inside the main content area after route changes
