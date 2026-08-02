'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getCurrentUserCompanyId } from '@/lib/auth-helpers';
import {
  DASHBOARD_FILTERS_STORAGE_KEY,
  DEFAULT_DASHBOARD_FILTERS,
  FISCAL_YEAR_FILTER_ALL,
  resolveFiscalYearSelectValue,
  sanitizeDashboardFilters,
  createDashboardAnalyticsService,
  type DashboardFilters,
  type DashboardCustomerRankingMode,
  type DashboardProductRankingLimit,
  type DashboardRevenueOperator,
  type DashboardTimeDisplayMode,
} from '@/lib/dashboard';
import {
  DashboardFiltersService,
  EMPTY_LINKED_OPTIONS,
  type DashboardLinkedFilterOptions,
} from '@/lib/dashboard/filters-service';
import { saveListFilters, useRestoreListFilters } from '@/lib/list-filter-storage';

type DashboardFilterContextValue = {
  filters: DashboardFilters;
  filtersRestored: boolean;
  linkedOptions: DashboardLinkedFilterOptions;
  optionsLoading: boolean;
  filterScopeLoading: boolean;
  setClientIds: (clientIds: string[]) => void;
  setDepartments: (departments: string[]) => void;
  setEstablishmentTypeIds: (establishmentTypeIds: string[]) => void;
  setTourIds: (tourIds: string[]) => void;
  setFiscalYearKey: (fiscalYearKey: string | null) => void;
  setRevenueFilter: (operator: DashboardRevenueOperator | null, amount: number | null) => void;
  setProductIds: (productIds: string[]) => void;
  setCategoryIds: (categoryIds: string[]) => void;
  setSubcategoryIds: (subcategoryIds: string[]) => void;
  setTimeDisplayMode: (mode: DashboardTimeDisplayMode) => void;
  setCustomerRankingMode: (mode: DashboardCustomerRankingMode) => void;
  setProductRankingMode: (mode: DashboardCustomerRankingMode) => void;
  setProductRankingLimit: (limit: DashboardProductRankingLimit) => void;
  resetFilters: () => void;
};

const DashboardFilterContext = createContext<DashboardFilterContextValue | null>(null);

function refreshLinkedState(
  service: DashboardFiltersService,
  filters: DashboardFilters,
  setFilters: React.Dispatch<React.SetStateAction<DashboardFilters>>,
  setLinkedOptions: React.Dispatch<React.SetStateAction<DashboardLinkedFilterOptions>>
) {
  const coerced = service.coerceFilters(filters);
  setFilters(coerced);
  setLinkedOptions(service.getLinkedOptions(coerced));
}

export function DashboardFilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_DASHBOARD_FILTERS);
  const [linkedOptions, setLinkedOptions] =
    useState<DashboardLinkedFilterOptions>(EMPTY_LINKED_OPTIONS);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [filterScopeLoading, setFilterScopeLoading] = useState(false);
  const filtersServiceRef = useRef<DashboardFiltersService | null>(null);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const analyticsServiceRef = useRef<Awaited<
    ReturnType<typeof createDashboardAnalyticsService>
  > | null>(null);

  const filtersRestored = useRestoreListFilters(
    DASHBOARD_FILTERS_STORAGE_KEY,
    DEFAULT_DASHBOARD_FILTERS,
    (stored) => {
      setFilters(sanitizeDashboardFilters(stored));
    }
  );

  const filterScopeKey = useMemo(
    () =>
      JSON.stringify({
        clientIds: filters.clientIds,
        departments: filters.departments,
        establishmentTypeIds: filters.establishmentTypeIds,
        tourIds: filters.tourIds,
        fiscalYearKey: filters.fiscalYearKey,
        revenueOperator: filters.revenueOperator,
        revenueAmount: filters.revenueAmount,
      }),
    [
      filters.clientIds,
      filters.departments,
      filters.establishmentTypeIds,
      filters.tourIds,
      filters.fiscalYearKey,
      filters.revenueOperator,
      filters.revenueAmount,
    ]
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const companyId = await getCurrentUserCompanyId();
        if (!companyId || cancelled) return;

        const service = await DashboardFiltersService.create(companyId);
        if (cancelled) return;

        filtersServiceRef.current = service;
        setFilters((prev) => {
          const coerced = service.coerceFilters(prev);
          setLinkedOptions(service.getLinkedOptions(coerced));
          return coerced;
        });
      } catch (error) {
        console.error('Erreur chargement filtres dashboard:', error);
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const applyFilters = useCallback((updater: (prev: DashboardFilters) => DashboardFilters) => {
    setFilters((prev) => {
      const next = updater(prev);
      const service = filtersServiceRef.current;
      if (!service) {
        return sanitizeDashboardFilters(next);
      }
      const coerced = service.coerceFilters(next);
      setLinkedOptions(service.getLinkedOptions(coerced));
      return coerced;
    });
  }, []);

  useEffect(() => {
    if (!filtersRestored || optionsLoading || !filtersServiceRef.current) return;

    let cancelled = false;

    const loadFilterScope = async () => {
      setFilterScopeLoading(true);
      try {
        const companyId = await getCurrentUserCompanyId();
        if (!companyId || cancelled || !filtersServiceRef.current) return;

        if (!analyticsServiceRef.current) {
          analyticsServiceRef.current = await createDashboardAnalyticsService(companyId);
        }

        const scopeFilters = JSON.parse(filterScopeKey) as Pick<
          DashboardFilters,
          | 'clientIds'
          | 'departments'
          | 'establishmentTypeIds'
          | 'tourIds'
          | 'fiscalYearKey'
          | 'revenueOperator'
          | 'revenueAmount'
        >;

        const scopedFilters: DashboardFilters = {
          ...filtersRef.current,
          ...scopeFilters,
        };

        const [revenueByClient, salesScopedProductIds] = await Promise.all([
          analyticsServiceRef.current.getClientRevenueByFiscalScope(scopedFilters.fiscalYearKey),
          analyticsServiceRef.current.getSalesScopedProductIds(scopedFilters),
        ]);

        if (cancelled || !filtersServiceRef.current) return;

        filtersServiceRef.current.setClientRevenueMap(revenueByClient);
        filtersServiceRef.current.setSalesScopedProductIds(salesScopedProductIds);

        setFilters((prev) => {
          const coerced = filtersServiceRef.current!.coerceFilters(prev);
          setLinkedOptions(filtersServiceRef.current!.getLinkedOptions(coerced));
          return coerced;
        });
      } catch (error) {
        console.error('Erreur chargement périmètre filtres dashboard:', error);
      } finally {
        if (!cancelled) {
          setFilterScopeLoading(false);
        }
      }
    };

    void loadFilterScope();

    return () => {
      cancelled = true;
    };
  }, [filterScopeKey, filtersRestored, optionsLoading]);

  useEffect(() => {
    if (!filtersRestored) return;
    saveListFilters(DASHBOARD_FILTERS_STORAGE_KEY, filters);
  }, [filters, filtersRestored]);

  useEffect(() => {
    if (!filtersRestored || !filtersServiceRef.current) return;
    refreshLinkedState(filtersServiceRef.current, filters, setFilters, setLinkedOptions);
  }, [filtersRestored, optionsLoading]);

  useEffect(() => {
    if (!filtersRestored || optionsLoading) return;

    if (
      resolveFiscalYearSelectValue(filters.fiscalYearKey, linkedOptions.fiscalYears) ===
        FISCAL_YEAR_FILTER_ALL &&
      filters.fiscalYearKey !== null
    ) {
      setFilters((prev) => ({ ...prev, fiscalYearKey: null }));
    }
  }, [filters.fiscalYearKey, filtersRestored, optionsLoading, linkedOptions.fiscalYears]);

  const setClientIds = useCallback(
    (clientIds: string[]) => applyFilters((prev) => ({ ...prev, clientIds })),
    [applyFilters]
  );

  const setDepartments = useCallback(
    (departments: string[]) => applyFilters((prev) => ({ ...prev, departments })),
    [applyFilters]
  );

  const setEstablishmentTypeIds = useCallback(
    (establishmentTypeIds: string[]) =>
      applyFilters((prev) => ({ ...prev, establishmentTypeIds })),
    [applyFilters]
  );

  const setTourIds = useCallback(
    (tourIds: string[]) => applyFilters((prev) => ({ ...prev, tourIds })),
    [applyFilters]
  );

  const setFiscalYearKey = useCallback(
    (fiscalYearKey: string | null) => applyFilters((prev) => ({ ...prev, fiscalYearKey })),
    [applyFilters]
  );

  const setRevenueFilter = useCallback(
    (revenueOperator: DashboardRevenueOperator | null, revenueAmount: number | null) =>
      applyFilters((prev) => ({
        ...prev,
        revenueOperator,
        revenueAmount,
      })),
    [applyFilters]
  );

  const setProductIds = useCallback(
    (productIds: string[]) => applyFilters((prev) => ({ ...prev, productIds })),
    [applyFilters]
  );

  const setCategoryIds = useCallback(
    (categoryIds: string[]) => applyFilters((prev) => ({ ...prev, categoryIds })),
    [applyFilters]
  );

  const setSubcategoryIds = useCallback(
    (subcategoryIds: string[]) => applyFilters((prev) => ({ ...prev, subcategoryIds })),
    [applyFilters]
  );

  const setTimeDisplayMode = useCallback(
    (timeDisplayMode: DashboardTimeDisplayMode) =>
      applyFilters((prev) => ({ ...prev, timeDisplayMode })),
    [applyFilters]
  );

  const setCustomerRankingMode = useCallback(
    (customerRankingMode: DashboardCustomerRankingMode) =>
      applyFilters((prev) => ({ ...prev, customerRankingMode })),
    [applyFilters]
  );

  const setProductRankingMode = useCallback(
    (productRankingMode: DashboardCustomerRankingMode) =>
      applyFilters((prev) => ({ ...prev, productRankingMode })),
    [applyFilters]
  );

  const setProductRankingLimit = useCallback(
    (productRankingLimit: DashboardProductRankingLimit) =>
      applyFilters((prev) => ({ ...prev, productRankingLimit })),
    [applyFilters]
  );

  const resetFilters = useCallback(() => {
    const service = filtersServiceRef.current;
    const next = service
      ? service.coerceFilters(DEFAULT_DASHBOARD_FILTERS)
      : DEFAULT_DASHBOARD_FILTERS;
    setFilters(next);
    if (service) {
      setLinkedOptions(service.getLinkedOptions(next));
    }
  }, []);

  const value = useMemo(
    () => ({
      filters,
      filtersRestored,
      linkedOptions,
      optionsLoading,
      filterScopeLoading,
      setClientIds,
      setDepartments,
      setEstablishmentTypeIds,
      setTourIds,
      setFiscalYearKey,
      setRevenueFilter,
      setProductIds,
      setCategoryIds,
      setSubcategoryIds,
      setTimeDisplayMode,
      setCustomerRankingMode,
      setProductRankingMode,
      setProductRankingLimit,
      resetFilters,
    }),
    [
      filters,
      filtersRestored,
      linkedOptions,
      optionsLoading,
      filterScopeLoading,
      setClientIds,
      setDepartments,
      setEstablishmentTypeIds,
      setTourIds,
      setFiscalYearKey,
      setRevenueFilter,
      setProductIds,
      setCategoryIds,
      setSubcategoryIds,
      setTimeDisplayMode,
      setCustomerRankingMode,
      setProductRankingMode,
      setProductRankingLimit,
      resetFilters,
    ]
  );

  return <DashboardFilterContext.Provider value={value}>{children}</DashboardFilterContext.Provider>;
}

export function useDashboardFilters() {
  const context = useContext(DashboardFilterContext);
  if (!context) {
    throw new Error('useDashboardFilters must be used within DashboardFilterProvider');
  }
  return context;
}
