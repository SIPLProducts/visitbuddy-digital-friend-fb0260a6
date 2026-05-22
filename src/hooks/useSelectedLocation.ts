import { useEffect, useState, useCallback } from 'react';
import { useUserRoles } from './useUserRoles';

const STORAGE_KEY = 'selectedLocationId';

/**
 * Global "currently selected location" hook.
 *
 * - Reads `selectedLocationId` from localStorage.
 * - Listens to the `locationChanged` window event fired by the Header.
 * - Returns:
 *    selectedLocationId: string ('all' or a UUID)
 *    isAllLocations: true when value is 'all' (HO Admin only)
 *
 * For non-HO users with exactly one assigned location, the hook auto-locks to
 * that single location regardless of what's in localStorage (no "all" option).
 */
export function useSelectedLocation() {
  const { isHoAdmin, isAdminHead, userRoles, loading: rolesLoading } = useUserRoles();
  const isGlobalViewer = isHoAdmin || isAdminHead;
  const [selectedLocationId, setSelectedLocationId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'all';
    return localStorage.getItem(STORAGE_KEY) || 'all';
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.locationId) {
        setSelectedLocationId(detail.locationId);
      } else {
        setSelectedLocationId(localStorage.getItem(STORAGE_KEY) || 'all');
      }
    };
    window.addEventListener('locationChanged', handler);

    const storageHandler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setSelectedLocationId(e.newValue || 'all');
      }
    };
    window.addEventListener('storage', storageHandler);

    return () => {
      window.removeEventListener('locationChanged', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }, []);

  // Effective selection: lock non-HO users with a single location to that one.
  const accessibleIds = userRoles.map(r => r.location_id);
  let effectiveId = selectedLocationId;

  if (!rolesLoading) {
    if (!isGlobalViewer) {
      // Non-HO: 'all' is not allowed.
      if (effectiveId === 'all' || !effectiveId) {
        effectiveId = accessibleIds[0] || '';
      } else if (accessibleIds.length > 0 && !accessibleIds.includes(effectiveId)) {
        // Selected id no longer accessible, fall back to first accessible.
        effectiveId = accessibleIds[0] || '';
      }
    }
  }

  const isAllLocations = isGlobalViewer && (effectiveId === 'all' || !effectiveId);

  /**
   * Apply `.eq('location_id', id)` to a Supabase query when a specific
   * location is selected. Returns the query untouched when "all" is active.
   */
  const applyLocationFilter = useCallback(
    <T,>(query: T, column: string = 'location_id'): T => {
      if (isAllLocations || !effectiveId) return query;
      // @ts-expect-error - generic Supabase query chain
      return query.eq(column, effectiveId);
    },
    [isAllLocations, effectiveId]
  );

  return {
    selectedLocationId: effectiveId,
    isAllLocations,
    applyLocationFilter,
    rolesLoading,
  };
}
