export type {
  AnalyticsComparisonParams,
  AnalyticsQueryParams,
  ComparisonResult,
  DateRange,
  FiscalYearBounds,
  FiscalYearConfig,
  RevenueDocument,
  RevenueDocumentType,
} from './types';

export {
  computeRevenueHt,
  computeRevenueHtFromDocuments,
  computeChangePercent,
  buildComparisonResult,
  countActiveClientsFromDocuments,
} from './revenue';

export {
  getFiscalYearContaining,
  getFiscalYearToDateRange,
  getPreviousFiscalYearSamePeriodRange,
  getFiscalYearByEndKey,
  getAllFiscalYearsDateRange,
  listSelectableFiscalYears,
  normalizeFiscalYearConfig,
  ALL_FISCAL_YEARS_LABEL,
} from './fiscal-year';

export { resolveEffectiveDateRange } from './filter-resolution';

export {
  computeRevenueByClient,
  computeRevenueByClientInRange,
  isRevenueFilterActive,
  matchesRevenueFilter,
  filterClientIdsByRevenue,
} from './client-revenue';

export {
  buildCommercialPerformanceData,
  filterRevenueDocumentsToClients,
  resolveCommercialPerformanceClients,
} from './commercial-performance';

export { buildSelectionKeyFigures } from './selection-key-figures';

export {
  aggregateTimeSpentHours,
  buildVisitDatesByClient,
  computeClientTimeSpentHours,
  getAverageTimeInHours,
} from './time-spent';

export {
  DashboardAnalyticsService,
  createDashboardAnalyticsService,
} from './dashboard-analytics-service';
