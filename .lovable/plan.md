## Changes

**1. Make Government Photo ID mandatory on New Visitor form**
- File: `src/pages/NewVisitor.tsx`
- Update zod schema: `govt_id_number: z.string().trim().min(1, "Government ID is required")`
- Add `*` to the field label to indicate required.

**2. Hide "Check In" action once a visitor is checked out**
- File: `src/components/visitors/VisitorActions.tsx` (line 132)
- Change condition from `(visitor.status === 'scheduled' || visitor.status === 'checked_out')` to only `visitor.status === 'scheduled'`, so checked-out visitors no longer show the Check In option in the actions menu.

No backend / DB changes required.