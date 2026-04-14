

# Truncate All Application Data (Excluding Users)

## What This Does
Deletes all records from every application table while preserving user accounts (`profiles`, `user_location_roles`, and auth users).

## Tables to Clear
All tables except `profiles` and `user_location_roles`:

1. **Visitor data**: `accompanying_visitors`, `visitor_agreements`, `visitor_watchlist`, `visitors`
2. **Vehicle data**: `vehicle_entries`, `anpr_events`, `vehicles`, `vehicle_types`
3. **Organization data**: `employees`, `departments`, `gates`, `locations`
4. **Appointments**: `appointments`
5. **System data**: `notifications`, `audit_logs`, `push_subscriptions`, `role_screen_permissions`, `screens`, `tenant_settings`

## Method
Run DELETE statements (since TRUNCATE CASCADE can't be used via the insert tool) in dependency order — child tables first, then parent tables.

## Important Note
- `locations` deletion will break `user_location_roles` references if those location IDs are referenced. Since we're keeping user roles, we should confirm: **should `locations` also be kept?**
- `tenant_settings` stores app configuration (company name, colors, NDA text). Deleting it resets all settings. **Should this be kept?**

## Execution
Use the database insert tool to run DELETE statements for each table.

