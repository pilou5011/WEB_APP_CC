import type { DashboardFiltersService } from './filters-service';
import type { DashboardFilters } from './types';

export type DashboardFilterScope = {
  clientIds: string[] | null;
  productIds: string[] | null;
};

/** Périmètre client + produit résolu par le moteur de filtres unique. */
export function resolveDashboardFilterScope(
  service: DashboardFiltersService,
  filters: DashboardFilters
): DashboardFilterScope {
  return {
    clientIds: service.resolveClientIds(filters),
    productIds: service.resolveProductIds(filters),
  };
}
