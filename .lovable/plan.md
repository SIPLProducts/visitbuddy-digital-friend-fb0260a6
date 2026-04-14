

# Auto-Select Location for Single-Location Users

## Problem
Currently, the header fetches **all** locations from the database regardless of the user's role assignments. Users with only one assigned location still see the full location dropdown and must select manually.

## Fix — `src/components/layout/Header.tsx`

### 1. Filter locations by user's assigned locations
For non-HO-Admin users, instead of fetching all locations, filter to only show locations the user has roles for:

```tsx
const fetchLocations = async () => {
  try {
    if (isHoAdmin) {
      // HO Admin sees all locations
      const { data } = await supabase.from('locations').select('id, name, city').order('name');
      setLocations(data || []);
    } else {
      // Regular users only see their assigned locations
      const assignedLocationIds = userRoles.map(r => r.location_id);
      if (assignedLocationIds.length === 0) return;
      const { data } = await supabase
        .from('locations')
        .select('id, name, city')
        .in('id', assignedLocationIds)
        .order('name');
      setLocations(data || []);
    }
  } catch (error) {
    console.error('Error fetching locations:', error);
  }
};
```

### 2. Auto-select and hide dropdown for single-location users
- If the user has exactly **one** location, auto-set it and skip the dropdown selector entirely (just show the location name as static text).
- If 2+ locations, show the dropdown as usual.

```tsx
{locations.length === 1 ? (
  <div className="flex items-center gap-2 text-sm">
    <Building2 className="h-4 w-4 text-muted-foreground" />
    <span className="font-medium">{locations[0].name}</span>
  </div>
) : (
  <Select ...>...</Select>
)}
```

### Files Changed
- `src/components/layout/Header.tsx`

