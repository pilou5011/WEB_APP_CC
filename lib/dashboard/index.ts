export type {
  DashboardFilters,
  DashboardTimeDisplayMode,
  DashboardCustomerRankingMode,
  DashboardProductRankingLimit,
  DashboardRevenueOperator,
  FigureComparison,
  KeyFiguresData,
  SelectionKeyFiguresData,
  CommercialPerformanceData,
  ProductPerformanceData,
  ProductQuantityRankingPlaceholder,
  RevenueEvolutionPlaceholder,
  RevenueEvolutionByMode,
  CustomerRevenuePlaceholder,
} from './types';
export {
  EMPTY_KEY_FIGURES,
  EMPTY_SELECTION_KEY_FIGURES,
  EMPTY_PRODUCT_PERFORMANCE,
  EMPTY_COMMERCIAL_PERFORMANCE,
  EMPTY_REVENUE_EVOLUTION,
  EMPTY_REVENUE_EVOLUTION_BY_MODE,
  formatDashboardCurrency,
  formatDashboardPercent,
  formatDashboardSharePercent,
  formatDashboardHours,
} from './types';
export {
  DASHBOARD_FILTERS_STORAGE_KEY,
  DEFAULT_DASHBOARD_FILTERS,
  FISCAL_YEAR_FILTER_ALL,
  sanitizeDashboardFilters,
  normalizeFiscalYearKey,
  resolveFiscalYearSelectValue,
  hasActiveDashboardFilters,
  stripProductScopeFilters,
  stripClientScopeFilters,
  isRevenueFilterActive,
} from './filters';
export { fetchKeyFigures, fetchCommercialPerformance } from './service';
export {
  DashboardFiltersService,
  EMPTY_LINKED_OPTIONS,
  type DashboardFilterOption,
  type DashboardLinkedFilterOptions,
} from './filters-service';
export { resolveDashboardFilterScope, type DashboardFilterScope } from './dashboard-scope';
export {
  DashboardAnalyticsService,
  createDashboardAnalyticsService,
  computeRevenueHt,
  computeRevenueHtFromDocuments,
  resolveEffectiveDateRange,
  listSelectableFiscalYears,
} from './analytics';
