
User wants email column added to the User Role Assignments table on the Assign Users tab.

The page already fetches emails via `list-user-emails` edge function (used previously for the Assign User dialog). Just need to render an Email column in the table.

## Plan

Add an **Email** column to the User Role Assignments table on the Assign Users tab.

### Change
**`src/pages/UserManagement.tsx`** — in the Assign Users tab table:
- Add `<TableHead>Email</TableHead>` between User and Location columns.
- Add `<TableCell>` rendering `userEmails[role.user_id] || '—'` (lookup map already exists from the existing `list-user-emails` fetch).
- Also extend the search filter to match against email so searching by email works.

### Result
Each row shows: User • Email • Location • Role • HO Admin • Actions — making it easy to identify which auth account a role is tied to.
