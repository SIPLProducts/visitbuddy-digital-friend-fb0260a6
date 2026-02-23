

# Enhancements to Visitor and Vehicle Registration

This plan covers 5 feature requests across the visitor and vehicle modules.

---

## 1. Accompanying Visitor Details Entry

**Current behavior:** When `accompanying_count > 0`, the system only stores a number.

**New behavior:** When the count is more than 0, dynamic form fields appear for each accompanying person to capture their name, phone number, and laptop details.

### Changes:
- **Database:** Create a new `accompanying_visitors` table with columns: `id`, `visitor_id` (FK to visitors), `name`, `phone`, `has_laptop`, `laptop_brand`, `laptop_serial`, `created_at`
- **NewVisitor.tsx:** When `accompanying_count` changes to > 0, render dynamic rows for each person with Name, Phone, Has Laptop toggle, and conditional Laptop Brand/Serial fields
- **VisitorEditDialog.tsx:** Same dynamic fields for editing accompanying visitors
- **Types:** Add `AccompanyingVisitor` interface to `database.ts`

---

## 2. Updated Vehicle Types

**Current list:** Truck, Van, Pickup, Trailer, Container, Tanker, Other

**New list:** Car, Auto, TATA Ace, DCM, 20 Feet Container, 40 Feet Container, Truck, Van, Pickup, Trailer, Tanker, JCB, Forklift, Other

### Changes:
- **NewVehicle.tsx:** Update the `vehicleTypes` array with the new list

---

## 3. Driving License Entry for Vehicles

**New behavior:** Add a "Driving License Number" field to the vehicle/driver registration form.

### Changes:
- **Database:** Add `driver_license` column (text, nullable) to the `vehicles` table
- **NewVehicle.tsx:** Add a "Driving License No." input field in the Driver Information card
- **Vehicle type:** Update `Vehicle` interface to include `driver_license`
- **Vehicles.tsx:** Show license number in vehicle details/history dialog

---

## 4. Department Field for Vehicles

**Current behavior:** Vehicle registration has no department association.

**New behavior:** Add a Department dropdown to the vehicle registration form.

### Changes:
- **Database:** Add `department_id` column (uuid, nullable, FK to departments) to the `vehicles` table
- **NewVehicle.tsx:** Fetch departments and add a Department dropdown in the Entry Details card
- **Vehicle type:** Update `Vehicle` interface to include `department_id` and optional `department`
- **Vehicles.tsx:** Show department in the vehicle table

---

## 5. Employee Car Auto-Allow

**New behavior:** Add a way to register employee vehicles that are automatically allowed entry without manual check-in approval.

### Changes:
- **Database:** Add `is_employee_vehicle` (boolean, default false) and `employee_id` (uuid, nullable, FK to employees) columns to the `vehicles` table
- **NewVehicle.tsx:** Add an "Employee Vehicle" toggle. When enabled, show an Employee dropdown to link the vehicle to an employee. These vehicles get `auto_allow = true` status
- **Database:** Add `auto_allow` column (boolean, default false) to `vehicles` table
- **Vehicles.tsx:** Show an "Auto" badge for employee vehicles; gate check-in logic can skip manual approval for these
- **VehicleGate.tsx:** When scanning an auto-allow vehicle, automatically check it in without requiring manual confirmation

---

## Technical Details

### New Database Migration

```sql
-- Accompanying visitors table
CREATE TABLE public.accompanying_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  has_laptop boolean DEFAULT false,
  laptop_brand text,
  laptop_serial text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.accompanying_visitors ENABLE ROW LEVEL SECURITY;
-- RLS policies matching visitors table patterns

-- Vehicle table additions
ALTER TABLE public.vehicles
  ADD COLUMN driver_license text,
  ADD COLUMN department_id uuid REFERENCES public.departments(id),
  ADD COLUMN is_employee_vehicle boolean DEFAULT false,
  ADD COLUMN employee_id uuid REFERENCES public.employees(id),
  ADD COLUMN auto_allow boolean DEFAULT false;
```

### Files to Create/Modify

| File | Action |
|------|--------|
| Database migration | Create new table + alter vehicles |
| `src/types/database.ts` | Add `AccompanyingVisitor` interface |
| `src/types/vehicle.ts` | Add new vehicle fields |
| `src/pages/NewVisitor.tsx` | Add dynamic accompanying visitor form |
| `src/pages/NewVehicle.tsx` | Update vehicle types, add license/department/employee fields |
| `src/pages/Vehicles.tsx` | Display new fields in table and dialogs |
| `src/components/visitors/VisitorEditDialog.tsx` | Add accompanying visitor editing |
| `src/pages/VehicleGate.tsx` | Auto-allow logic for employee vehicles |

