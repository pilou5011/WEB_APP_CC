import type { DashboardFilters } from './types';
import {
  fetchDashboardClientCatalog,
  type DashboardCatalog,
} from './analytics/client-catalog';
import {
  fetchDashboardProductCatalog,
  type DashboardProductCatalog,
} from './analytics/product-catalog';
import { fetchFiscalYearConfig } from './analytics/data-access';
import { listSelectableFiscalYears } from './analytics/fiscal-year';
import { formatDepartment } from '@/lib/postal-code-utils';
import { FISCAL_YEAR_FILTER_ALL, normalizeFiscalYearKey } from './filters';
import { filterClientCatalogPool, type ClientScopeDimension } from './client-scope';
import {
  filterProductCatalogPool,
  type ProductScopeDimension,
} from './product-scope';
import type { DashboardProductCatalogEntry } from './analytics/product-catalog';

export type DashboardFilterOption = {
  value: string;
  label: string;
};

export type DashboardLinkedFilterOptions = {
  clients: DashboardFilterOption[];
  departments: DashboardFilterOption[];
  establishmentTypes: DashboardFilterOption[];
  tours: DashboardFilterOption[];
  fiscalYears: DashboardFilterOption[];
  products: DashboardFilterOption[];
  categories: DashboardFilterOption[];
  subcategories: DashboardFilterOption[];
};

export const EMPTY_LINKED_OPTIONS: DashboardLinkedFilterOptions = {
  clients: [],
  departments: [],
  establishmentTypes: [],
  tours: [],
  fiscalYears: [{ value: FISCAL_YEAR_FILTER_ALL, label: 'Tous les exercices' }],
  products: [],
  categories: [],
  subcategories: [],
};

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
    return a.localeCompare(b, 'fr');
  });
}

export class DashboardFiltersService {
  private revenueByClient: Map<string, number> | null = null;
  private salesScopedProductIds: Set<string> | null = null;

  private constructor(
    private readonly catalog: DashboardCatalog,
    private readonly productCatalog: DashboardProductCatalog,
    private readonly fiscalYearOptions: DashboardFilterOption[]
  ) {}

  static async create(companyId: string): Promise<DashboardFiltersService> {
    const [catalog, productCatalog, fiscalConfig] = await Promise.all([
      fetchDashboardClientCatalog(companyId),
      fetchDashboardProductCatalog(companyId),
      fetchFiscalYearConfig(companyId),
    ]);

    const fiscalYears = listSelectableFiscalYears(new Date(), fiscalConfig).map((year) => ({
      value: year.value,
      label: year.label,
    }));

    return new DashboardFiltersService(catalog, productCatalog, [
      { value: FISCAL_YEAR_FILTER_ALL, label: 'Tous les exercices' },
      ...fiscalYears,
    ]);
  }

  getCatalog(): DashboardCatalog {
    return this.catalog;
  }

  getProductCatalog(): DashboardProductCatalog {
    return this.productCatalog;
  }

  getScopedProductPool(filters: DashboardFilters): DashboardProductCatalogEntry[] {
    return filterProductCatalogPool(
      this.productCatalog.products,
      filters,
      this.salesScopedProductIds
    );
  }

  setClientRevenueMap(revenueByClient: Map<string, number> | null): void {
    this.revenueByClient = revenueByClient;
  }

  setSalesScopedProductIds(productIds: Set<string> | null): void {
    this.salesScopedProductIds = productIds;
  }

  getClientLinkedOptions(filters: DashboardFilters): Omit<
    DashboardLinkedFilterOptions,
    'products' | 'categories' | 'subcategories'
  > {
    const departmentPool = filterClientCatalogPool(
      this.catalog.clients,
      filters,
      this.revenueByClient,
      'departments'
    );
    const tourPool = filterClientCatalogPool(
      this.catalog.clients,
      filters,
      this.revenueByClient,
      'tourIds'
    );
    const establishmentPool = filterClientCatalogPool(
      this.catalog.clients,
      filters,
      this.revenueByClient,
      'establishmentTypeIds'
    );
    const clientPool = filterClientCatalogPool(
      this.catalog.clients,
      filters,
      this.revenueByClient,
      'clientIds'
    );

    const departments = uniqueSorted(
      departmentPool.map((client) => client.department).filter(Boolean) as string[]
    );
    const tourIds = uniqueSorted(
      tourPool.map((client) => client.tourId).filter(Boolean) as string[]
    );
    const establishmentTypeIds = uniqueSorted(
      establishmentPool
        .map((client) => client.establishmentTypeId)
        .filter(Boolean) as string[]
    );

    return {
      departments: departments.map((department) => ({
        value: department,
        label: formatDepartment(department),
      })),
      tours: tourIds.map((tourId) => ({
        value: tourId,
        label: this.catalog.tourNames.get(tourId) ?? tourId,
      })),
      establishmentTypes: establishmentTypeIds.map((typeId) => ({
        value: typeId,
        label: this.catalog.establishmentTypeNames.get(typeId) ?? typeId,
      })),
      clients: [...clientPool]
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
        .map((client) => ({ value: client.id, label: client.name })),
      fiscalYears: this.fiscalYearOptions,
    };
  }

  getProductLinkedOptions(filters: DashboardFilters): Pick<
    DashboardLinkedFilterOptions,
    'products' | 'categories' | 'subcategories'
  > {
    const productPool = filterProductCatalogPool(
      this.productCatalog.products,
      filters,
      this.salesScopedProductIds,
      'productIds'
    );
    const categoryPool = filterProductCatalogPool(
      this.productCatalog.products,
      filters,
      this.salesScopedProductIds,
      'categoryIds'
    );
    const subcategoryPool = filterProductCatalogPool(
      this.productCatalog.products,
      filters,
      this.salesScopedProductIds,
      'subcategoryIds'
    );

    const categoryIds = uniqueSorted(
      categoryPool.map((product) => product.categoryId).filter(Boolean) as string[]
    );
    const subcategoryIds = uniqueSorted(
      subcategoryPool.map((product) => product.subcategoryId).filter(Boolean) as string[]
    );

    return {
      products: [...productPool]
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
        .map((product) => ({ value: product.id, label: product.name })),
      categories: categoryIds.map((categoryId) => ({
        value: categoryId,
        label: this.productCatalog.categoryNames.get(categoryId) ?? categoryId,
      })),
      subcategories: subcategoryIds.map((subcategoryId) => ({
        value: subcategoryId,
        label: this.productCatalog.subcategoryNames.get(subcategoryId) ?? subcategoryId,
      })),
    };
  }

  getLinkedOptions(filters: DashboardFilters): DashboardLinkedFilterOptions {
    return {
      ...this.getClientLinkedOptions(filters),
      ...this.getProductLinkedOptions(filters),
    };
  }

  coerceFilters(filters: DashboardFilters): DashboardFilters {
    const options = this.getLinkedOptions(filters);

    const validDepartments = new Set(options.departments.map((option) => option.value));
    const validTours = new Set(options.tours.map((option) => option.value));
    const validEstablishmentTypes = new Set(
      options.establishmentTypes.map((option) => option.value)
    );
    const validClients = new Set(options.clients.map((option) => option.value));
    const validFiscalYears = new Set(options.fiscalYears.map((option) => option.value));
    const validProducts = new Set(options.products.map((option) => option.value));
    const validCategories = new Set(options.categories.map((option) => option.value));
    const validSubcategories = new Set(options.subcategories.map((option) => option.value));

    return {
      ...filters,
      departments: filters.departments.filter((value) => validDepartments.has(value)),
      tourIds: filters.tourIds.filter((value) => validTours.has(value)),
      establishmentTypeIds: filters.establishmentTypeIds.filter((value) =>
        validEstablishmentTypes.has(value)
      ),
      clientIds: filters.clientIds.filter((value) => validClients.has(value)),
      productIds: filters.productIds.filter((value) => validProducts.has(value)),
      categoryIds: filters.categoryIds.filter((value) => validCategories.has(value)),
      subcategoryIds: filters.subcategoryIds.filter((value) => validSubcategories.has(value)),
      fiscalYearKey: (() => {
        const normalized = normalizeFiscalYearKey(filters.fiscalYearKey);
        if (normalized === null) return null;
        return validFiscalYears.has(normalized) ? normalized : null;
      })(),
    };
  }

  resolveClientIds(filters: DashboardFilters): string[] | null {
    const pool = filterClientCatalogPool(
      this.catalog.clients,
      filters,
      this.revenueByClient
    );
    const hasClientDimensionFilters =
      filters.clientIds.length > 0 ||
      filters.departments.length > 0 ||
      filters.establishmentTypeIds.length > 0 ||
      filters.tourIds.length > 0 ||
      (filters.revenueOperator !== null &&
        filters.revenueAmount !== null &&
        filters.revenueAmount > 0 &&
        this.revenueByClient !== null);

    if (!hasClientDimensionFilters) {
      return null;
    }

    return pool.map((client) => client.id);
  }

  resolveProductIds(filters: DashboardFilters): string[] | null {
    const pool = filterProductCatalogPool(
      this.productCatalog.products,
      filters,
      this.salesScopedProductIds
    );
    const hasProductDimensionFilters =
      filters.productIds.length > 0 ||
      filters.categoryIds.length > 0 ||
      filters.subcategoryIds.length > 0;

    if (!hasProductDimensionFilters) {
      return null;
    }

    return pool.map((product) => product.id);
  }
}

export type { ClientScopeDimension, ProductScopeDimension };
