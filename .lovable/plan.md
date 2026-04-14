

# Fix "No Role" Display in Header

## Problem
The Header component's `roleLabels` map only includes 3 roles (`admin`, `manager`, `operator`) but the system has 5 roles. When a user has `gate_security` or `visitor` role, `roleLabels[currentRole]` returns `undefined`, causing "No Role" to display.

## Fix

### `src/components/layout/Header.tsx`
Add the missing role labels to the `roleLabels` object:

```typescript
const roleLabels: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  operator: 'Operator',
  gate_security: 'Gate Security',  // missing
  visitor: 'Visitor',              // missing
};
```

This is a one-line fix (adding 2 entries to the object). No other files need changes.

