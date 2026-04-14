

# Bulk-Create Auth Accounts for All Employees (Manager Role at HWMP)

## Summary
Create auth accounts for all 38 employees who have email addresses, with password `123456` and the `manager` role at location HWMP.

## Plan

### 1. Create edge function `bulk-create-employee-users`
- Fetches all employees with emails from the database
- For each employee:
  - Creates an auth user via `supabase.auth.admin.createUser()` with password `123456` and `email_confirm: true`
  - Creates a profile record with the employee's name
  - Inserts a `user_location_roles` record with `role = 'manager'` and `location_id = '013e5f3f-0fee-45a8-a1a8-c625ef9e53bb'` (HWMP)
- Skips employees whose email already exists as an auth user
- Returns a JSON summary of created vs skipped accounts

### 2. Deploy and invoke the function once
- Deploy the edge function
- Call it to process all 38 employees
- Verify the results

### 3. No UI changes needed
User Management already displays users from `user_location_roles`.

## Files
- `supabase/functions/bulk-create-employee-users/index.ts` (new)

