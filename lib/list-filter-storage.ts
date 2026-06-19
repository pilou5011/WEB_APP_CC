'use client';

import { useEffect, useState } from 'react';

export function readListFilters<T extends Record<string, unknown>>(
  storageKey: string,
  defaults: T
): T {
  if (typeof window === 'undefined') return defaults;

  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return defaults;

    const parsed = JSON.parse(raw) as Partial<T>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

export function saveListFilters(storageKey: string, filters: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.setItem(storageKey, JSON.stringify(filters));
  } catch {
    // Ignore quota / private mode errors
  }
}

/**
 * Restores persisted filters after mount to keep SSR and initial client render identical.
 */
export function useRestoreListFilters<T extends Record<string, unknown>>(
  storageKey: string,
  defaults: T,
  apply: (filters: T) => void
): boolean {
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    apply(readListFilters(storageKey, defaults));
    setRestored(true);
    // Restore once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return restored;
}
