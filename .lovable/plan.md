

# Add Email Configuration Tab to Settings

## Overview
Add a new "Email" tab to the Settings page where users can configure SMTP settings. These settings will be stored in a new `email_config` table and used across the application for sending emails. The tab will include a test email feature and the ability to delete the configuration.

## Build Error Fix
The `VisitorReport.tsx` build errors reference `stats` but the file already uses `filteredStats`. This appears to be a stale cache issue. I will do a search-and-replace pass to confirm no lingering `stats` references exist, and fix any if found.

## Database Changes

### New table: `email_config`
```sql
CREATE TABLE public.email_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  smtp_host text NOT NULL,
  smtp_port integer NOT NULL DEFAULT 587,
  smtp_username text NOT NULL,
  smtp_password text NOT NULL,
  sender_name text NOT NULL DEFAULT '',
  sender_email text NOT NULL,
  use_tls boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_config ENABLE ROW LEVEL SECURITY;

-- Only HO admins can manage email config
CREATE POLICY "HO Admins can manage email config" ON public.email_config
  FOR ALL TO authenticated
  USING (is_ho_admin(auth.uid()))
  WITH CHECK (is_ho_admin(auth.uid()));

-- Authenticated users can read (needed for edge functions to use the config)
CREATE POLICY "Authenticated can view email config" ON public.email_config
  FOR SELECT TO authenticated
  USING (true);
```

### New edge function: `test-email`
A backend function that reads the SMTP config from the database and sends a test email to a specified address. This runs server-side so SMTP credentials are never exposed to the client.

## Frontend Changes

### 1. Settings.tsx — Add "Email" tab
- Add a new `TabsTrigger` with a Mail icon labeled "Email"
- Add corresponding `TabsContent` with:
  - SMTP Host, Port, Username, Password fields
  - Sender Name, Sender Email fields
  - TLS toggle switch
  - Save button (inserts or updates the single row in `email_config`)
  - Test button — opens a small dialog asking for receiver email, then invokes the `test-email` edge function
  - Delete button — removes the config row after confirmation

### 2. Edge function: `supabase/functions/test-email/index.ts`
- Reads SMTP config from `email_config` table using service role
- Sends a simple test email via SMTP (using Deno's `smtp` module)
- Returns success/failure to the client

## Files to create/modify
- **Migration**: Create `email_config` table with RLS
- **`supabase/functions/test-email/index.ts`**: New edge function
- **`src/pages/Settings.tsx`**: Add Email tab with form, test dialog, and delete option
- **`src/pages/VisitorReport.tsx`**: Fix any remaining `stats` references if found

