import type { DashboardFilters } from './types';
import { isRevenueFilterActive } from './analytics/client-revenue';

export { isRevenueFilterActive };
export const DASHBOARD_FILTERS_STORAGE_KEY = 'dashboard-filters';

/** Valeur UI du sélecteur « Tous les exercices » (stockée comme `null` en état). */
export const FISCAL_YEAR_FILTER_ALL = 'all';

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilters = {
  clientIds: [],
  departments: [],
  establishmentTypeIds: [],
  tourIds: [],
  fiscalYearKey: null,
  revenueOperator: null,
  revenueAmount: null,
  productIds: [],
  categoryIds: [],
  subcategoryIds: [],
  timeDisplayMode: 'month',
  customerRankingMode: 'top',
  productRankingMode: 'top',
  productRankingLimit: 10,
};

export function normalizeFiscalYearKey(
  fiscalYearKey: string | null | undefined
): string | null {
  if (
    fiscalYearKey === null ||
    fiscalYearKey === undefined ||
    fiscalYearKey === '' ||
    fiscalYearKey === 'current' ||
    fiscalYearKey === FISCAL_YEAR_FILTER_ALL
  ) {
    return null;
  }

  return fiscalYearKey;
}

/** Valeur contrôlée du Select, avec repli sur « Tous les exercices » si invalide ou options non chargées. */
export function resolveFiscalYearSelectValue(
  fiscalYearKey: string | null,
  fiscalYearOptions: Array<{ value: string; label: string }>
): string {
  const normalized = normalizeFiscalYearKey(fiscalYearKey);
  if (normalized === null) {
    return FISCAL_YEAR_FILTER_ALL;
  }

  const validValues = new Set(fiscalYearOptions.map((option) => option.value));
  return validValues.has(normalized) ? normalized : FISCAL_YEAR_FILTER_ALL;
}

function sanitizeRevenueAmount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

function sanitizeRevenueOperator(value: unknown): DashboardFilters['revenueOperator'] {
  return value === 'gt' || value === 'lt' ? value : null;
}

function sanitizeProductRankingLimit(value: unknown): DashboardFilters['productRankingLimit'] {
  if (value === 5 || value === 10 || value === 20) {
    return value;
  }
  return 10;
}

export function sanitizeDashboardFilters(
  stored: Partial<DashboardFilters>
): DashboardFilters {
  const revenueOperator = sanitizeRevenueOperator(stored.revenueOperator);
  const revenueAmount = sanitizeRevenueAmount(stored.revenueAmount);

  return {
    clientIds: Array.isArray(stored.clientIds) ? stored.clientIds.filter(Boolean) : [],
    departments: Array.isArray(stored.departments) ? stored.departments.filter(Boolean) : [],
    establishmentTypeIds: Array.isArray(stored.establishmentTypeIds)
      ? stored.establishmentTypeIds.filter(Boolean)
      : [],
    tourIds: Array.isArray(stored.tourIds) ? stored.tourIds.filter(Boolean) : [],
    fiscalYearKey: normalizeFiscalYearKey(
      typeof stored.fiscalYearKey === 'string' ? stored.fiscalYearKey : null
    ),
    revenueOperator: revenueAmount === null ? null : revenueOperator ?? 'gt',
    revenueAmount,
    productIds: Array.isArray(stored.productIds) ? stored.productIds.filter(Boolean) : [],
    categoryIds: Array.isArray(stored.categoryIds) ? stored.categoryIds.filter(Boolean) : [],
    subcategoryIds: Array.isArray(stored.subcategoryIds)
      ? stored.subcategoryIds.filter(Boolean)
      : [],
    timeDisplayMode: stored.timeDisplayMode === 'week' ? 'week' : 'month',
    customerRankingMode: stored.customerRankingMode === 'bottom' ? 'bottom' : 'top',
    productRankingMode: stored.productRankingMode === 'bottom' ? 'bottom' : 'top',
    productRankingLimit: sanitizeProductRankingLimit(stored.productRankingLimit),
  };
}

/** Retire les filtres de périmètre produit (Produits, Catégorie, Sous-catégorie). */
export function stripProductScopeFilters(filters: DashboardFilters): DashboardFilters {
  return {
    ...filters,
    productIds: [],
    categoryIds: [],
    subcategoryIds: [],
  };
}

/** Retire les filtres de périmètre client (Clients, Département, Type, Tournée). */
export function stripClientScopeFilters(filters: DashboardFilters): DashboardFilters {
  return {
    ...filters,
    clientIds: [],
    departments: [],
    establishmentTypeIds: [],
    tourIds: [],
  };
}

export function hasActiveProductFilters(filters: DashboardFilters): boolean {
  return (
    filters.productIds.length > 0 ||
    filters.categoryIds.length > 0 ||
    filters.subcategoryIds.length > 0
  );
}

export function hasActiveDashboardFilters(filters: DashboardFilters): boolean {
  return (
    filters.clientIds.length > 0 ||
    filters.departments.length > 0 ||
    filters.establishmentTypeIds.length > 0 ||
    filters.tourIds.length > 0 ||
    filters.fiscalYearKey !== null ||
    isRevenueFilterActive(filters) ||
    filters.customerRankingMode !== DEFAULT_DASHBOARD_FILTERS.customerRankingMode ||
    filters.productRankingMode !== DEFAULT_DASHBOARD_FILTERS.productRankingMode ||
    filters.productRankingLimit !== DEFAULT_DASHBOARD_FILTERS.productRankingLimit
  );
}
