import type { CommercialPerformanceData, DashboardFilters } from './types';
import { createDashboardAnalyticsService } from './analytics';

export async function fetchKeyFigures(companyId: string, filters: DashboardFilters) {
  const service = await createDashboardAnalyticsService(companyId);
  return service.getKeyFigures(filters);
}

export async function fetchCommercialPerformance(
  companyId: string,
  filters: DashboardFilters
): Promise<CommercialPerformanceData> {
  const service = await createDashboardAnalyticsService(companyId);
  return service.getCommercialPerformance(filters);
}
