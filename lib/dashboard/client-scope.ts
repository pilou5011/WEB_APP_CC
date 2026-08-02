import type { DashboardClientCatalogEntry } from './analytics/client-catalog';
import {
  filterClientIdsByRevenue,
  isRevenueFilterActive,
  matchesRevenueFilter,
} from './analytics/client-revenue';
import type { DashboardFilters } from './types';

export type ClientScopeDimension =
  | 'departments'
  | 'tourIds'
  | 'establishmentTypeIds'
  | 'clientIds'
  | 'revenue';

export function hasClientScopeFilters(filters: DashboardFilters): boolean {
  return (
    filters.clientIds.length > 0 ||
    filters.departments.length > 0 ||
    filters.establishmentTypeIds.length > 0 ||
    filters.tourIds.length > 0 ||
    isRevenueFilterActive(filters)
  );
}

export function filterClientCatalogPool(
  catalog: DashboardClientCatalogEntry[],
  filters: DashboardFilters,
  revenueByClient: Map<string, number> | null,
  exclude?: ClientScopeDimension
): DashboardClientCatalogEntry[] {
  let pool = catalog;

  if (exclude !== 'departments' && filters.departments.length > 0) {
    pool = pool.filter(
      (client) => client.department && filters.departments.includes(client.department)
    );
  }
  if (exclude !== 'tourIds' && filters.tourIds.length > 0) {
    pool = pool.filter((client) => client.tourId && filters.tourIds.includes(client.tourId));
  }
  if (exclude !== 'establishmentTypeIds' && filters.establishmentTypeIds.length > 0) {
    pool = pool.filter(
      (client) =>
        client.establishmentTypeId &&
        filters.establishmentTypeIds.includes(client.establishmentTypeId)
    );
  }
  if (exclude !== 'clientIds' && filters.clientIds.length > 0) {
    pool = pool.filter((client) => filters.clientIds.includes(client.id));
  }

  if (
    exclude !== 'revenue' &&
    isRevenueFilterActive(filters) &&
    revenueByClient &&
    filters.revenueOperator &&
    filters.revenueAmount !== null
  ) {
    pool = pool.filter((client) =>
      matchesRevenueFilter(
        revenueByClient.get(client.id) ?? 0,
        filters.revenueOperator!,
        filters.revenueAmount!
      )
    );
  }

  return pool;
}

export function resolveScopedClientIds(
  catalog: DashboardClientCatalogEntry[],
  filters: DashboardFilters,
  revenueByClient: Map<string, number> | null
): string[] | null {
  if (!hasClientScopeFilters(filters)) {
    return null;
  }

  return filterClientCatalogPool(catalog, filters, revenueByClient).map((client) => client.id);
}

export { filterClientIdsByRevenue, isRevenueFilterActive, matchesRevenueFilter };
