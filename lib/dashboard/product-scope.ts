import type { DashboardProductCatalogEntry } from './analytics/product-catalog';
import type { DashboardFilters } from './types';

export type ProductScopeDimension = 'productIds' | 'categoryIds' | 'subcategoryIds';

export function hasProductScopeFilters(filters: DashboardFilters): boolean {
  return (
    filters.productIds.length > 0 ||
    filters.categoryIds.length > 0 ||
    filters.subcategoryIds.length > 0
  );
}

export function filterProductCatalogPool(
  products: DashboardProductCatalogEntry[],
  filters: DashboardFilters,
  salesScopedProductIds: Set<string> | null,
  exclude?: ProductScopeDimension
): DashboardProductCatalogEntry[] {
  let pool = products;

  if (salesScopedProductIds !== null) {
    pool = pool.filter((product) => salesScopedProductIds.has(product.id));
  }

  if (exclude !== 'categoryIds' && filters.categoryIds.length > 0) {
    pool = pool.filter(
      (product) => product.categoryId && filters.categoryIds.includes(product.categoryId)
    );
  }

  if (exclude !== 'subcategoryIds' && filters.subcategoryIds.length > 0) {
    pool = pool.filter(
      (product) =>
        product.subcategoryId && filters.subcategoryIds.includes(product.subcategoryId)
    );
  }

  if (exclude !== 'productIds' && filters.productIds.length > 0) {
    pool = pool.filter((product) => filters.productIds.includes(product.id));
  }

  return pool;
}

export function resolveScopedProductIds(
  products: DashboardProductCatalogEntry[],
  filters: DashboardFilters,
  salesScopedProductIds: Set<string> | null
): string[] | null {
  if (!hasProductScopeFilters(filters)) {
    return null;
  }

  return filterProductCatalogPool(products, filters, salesScopedProductIds).map(
    (product) => product.id
  );
}
