import type { DashboardFilters } from '../types';
import type { DateRange, FiscalYearConfig } from './types';
import { toDateString } from './date-utils';
import {
  getAllFiscalYearsDateRange,
  getFiscalYearByEndKey,
} from './fiscal-year';

/**
 * Détermine la plage de dates effective pour les graphiques du dashboard.
 */
export function resolveEffectiveDateRange(
  filters: DashboardFilters,
  fiscalConfig: FiscalYearConfig,
  referenceDate = new Date()
): { range: DateRange; fiscalYearLabel: string } {
  if (filters.fiscalYearKey) {
    const fiscalBounds = getFiscalYearByEndKey(filters.fiscalYearKey, fiscalConfig);
    return {
      range: {
        start: toDateString(fiscalBounds.start),
        end: toDateString(fiscalBounds.end),
      },
      fiscalYearLabel: fiscalBounds.label,
    };
  }

  const allRange = getAllFiscalYearsDateRange(referenceDate, fiscalConfig);
  return {
    range: { start: allRange.start, end: allRange.end },
    fiscalYearLabel: allRange.label,
  };
}

export function buildFiltersCacheKey(filters: DashboardFilters): string {
  return JSON.stringify(filters);
}
