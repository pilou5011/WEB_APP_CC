'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDashboardFilters } from '@/components/dashboard/dashboard-filter-provider';
import {
  type DashboardFilters,
  createDashboardAnalyticsService,
  EMPTY_COMMERCIAL_PERFORMANCE,
  EMPTY_KEY_FIGURES,
  EMPTY_PRODUCT_PERFORMANCE,
  EMPTY_REVENUE_EVOLUTION_BY_MODE,
  stripProductScopeFilters,
  type CommercialPerformanceData,
  type KeyFiguresData,
  type ProductPerformanceData,
  type RevenueEvolutionByMode,
} from '@/lib/dashboard';
import { getCurrentUserCompanyId } from '@/lib/auth-helpers';

type DashboardAnalyticsContextValue = {
  keyFigures: KeyFiguresData;
  revenueEvolutionByMode: RevenueEvolutionByMode;
  commercialPerformance: CommercialPerformanceData;
  productPerformance: ProductPerformanceData;
  fixedLoading: boolean;
  commercialLoading: boolean;
  commercialRefreshing: boolean;
  productLoading: boolean;
  productRefreshing: boolean;
};

const DashboardAnalyticsContext = createContext<DashboardAnalyticsContextValue | null>(null);

export function DashboardAnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { filters, filtersRestored } = useDashboardFilters();
  const [keyFigures, setKeyFigures] = useState<KeyFiguresData>(EMPTY_KEY_FIGURES);
  const [revenueEvolutionByMode, setRevenueEvolutionByMode] = useState<RevenueEvolutionByMode>(
    EMPTY_REVENUE_EVOLUTION_BY_MODE
  );
  const [commercialPerformance, setCommercialPerformance] = useState<CommercialPerformanceData>(
    EMPTY_COMMERCIAL_PERFORMANCE
  );
  const [productPerformance, setProductPerformance] = useState<ProductPerformanceData>(
    EMPTY_PRODUCT_PERFORMANCE
  );
  const [fixedLoading, setFixedLoading] = useState(true);
  const [commercialLoading, setCommercialLoading] = useState(true);
  const [commercialRefreshing, setCommercialRefreshing] = useState(false);
  const [productLoading, setProductLoading] = useState(true);
  const [productRefreshing, setProductRefreshing] = useState(false);
  const serviceRef = useRef<Awaited<ReturnType<typeof createDashboardAnalyticsService>> | null>(
    null
  );
  const companyIdRef = useRef<string | null>(null);
  const fixedLoadedRef = useRef(false);
  const commercialLoadedRef = useRef(false);
  const productLoadedRef = useRef(false);
  const fixedCacheRef = useRef<
    Map<string, { keyFigures: KeyFiguresData; revenueEvolutionByMode: RevenueEvolutionByMode }>
  >(new Map());
  const commercialCacheRef = useRef<Map<string, CommercialPerformanceData>>(new Map());
  const productCacheRef = useRef<Map<string, ProductPerformanceData>>(new Map());
  const pendingFixedRef = useRef<
    Map<
      string,
      Promise<{ keyFigures: KeyFiguresData; revenueEvolutionByMode: RevenueEvolutionByMode }>
    >
  >(new Map());
  const pendingCommercialRef = useRef<Map<string, Promise<CommercialPerformanceData>>>(new Map());
  const pendingProductRef = useRef<Map<string, Promise<ProductPerformanceData>>>(new Map());

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  const commercialFiltersKey = useMemo(
    () => JSON.stringify(stripProductScopeFilters(filters)),
    [filters]
  );

  function buildFilteredCacheKey(
    companyId: string,
    scopeKey: string,
    namespace: 'commercial' | 'product'
  ): string {
    return `${companyId}|${namespace}|${scopeKey}`;
  }

  useEffect(() => {
    if (!filtersRestored) return;

    let cancelled = false;

    const loadFixed = async () => {
      try {
        const companyId = await getCurrentUserCompanyId();
        if (!companyId) {
          if (!cancelled) {
            setKeyFigures(EMPTY_KEY_FIGURES);
            setRevenueEvolutionByMode(EMPTY_REVENUE_EVOLUTION_BY_MODE);
            setFixedLoading(false);
            fixedLoadedRef.current = false;
            serviceRef.current = null;
            companyIdRef.current = null;
            fixedCacheRef.current.clear();
            commercialCacheRef.current.clear();
            productCacheRef.current.clear();
          }
          return;
        }

        const cached = fixedCacheRef.current.get(companyId);
        if (cached) {
          if (!cancelled) {
            setKeyFigures(cached.keyFigures);
            setRevenueEvolutionByMode(cached.revenueEvolutionByMode);
            setFixedLoading(false);
            fixedLoadedRef.current = true;
          }
          return;
        }

        if (!fixedLoadedRef.current) {
          setFixedLoading(true);
        }

        if (!serviceRef.current || companyIdRef.current !== companyId) {
          serviceRef.current = await createDashboardAnalyticsService(companyId);
          companyIdRef.current = companyId;
          fixedCacheRef.current.clear();
          commercialCacheRef.current.clear();
          productCacheRef.current.clear();
        }

        let request = pendingFixedRef.current.get(companyId);
        if (!request) {
          request = serviceRef.current.getFixedDashboardData();
          pendingFixedRef.current.set(companyId, request);
        }

        const data = await request.finally(() => {
          pendingFixedRef.current.delete(companyId);
        });
        fixedCacheRef.current.set(companyId, data);

        if (!cancelled) {
          setKeyFigures(data.keyFigures);
          setRevenueEvolutionByMode(data.revenueEvolutionByMode);
          fixedLoadedRef.current = true;
        }
      } catch (error) {
        console.error('Erreur chargement chiffres clés / évolution CA:', error);
        if (!cancelled && !fixedLoadedRef.current) {
          setKeyFigures(EMPTY_KEY_FIGURES);
          setRevenueEvolutionByMode(EMPTY_REVENUE_EVOLUTION_BY_MODE);
        }
      } finally {
        if (!cancelled) {
          setFixedLoading(false);
        }
      }
    };

    void loadFixed();

    return () => {
      cancelled = true;
    };
  }, [filtersRestored]);

  useEffect(() => {
    if (!filtersRestored) return;

    let cancelled = false;

    const loadFilteredAnalytics = async () => {
      try {
        const companyId = await getCurrentUserCompanyId();
        if (!companyId) {
          if (!cancelled) {
            setCommercialPerformance(EMPTY_COMMERCIAL_PERFORMANCE);
            setProductPerformance(EMPTY_PRODUCT_PERFORMANCE);
            setCommercialLoading(false);
            setCommercialRefreshing(false);
            setProductLoading(false);
            setProductRefreshing(false);
            commercialLoadedRef.current = false;
            productLoadedRef.current = false;
          }
          return;
        }

        const commercialCacheKey = buildFilteredCacheKey(companyId, commercialFiltersKey, 'commercial');
        const productCacheKey = buildFilteredCacheKey(companyId, filtersKey, 'product');
        const cachedCommercial = commercialCacheRef.current.get(commercialCacheKey);
        const cachedProduct = productCacheRef.current.get(productCacheKey);

        if (cachedCommercial && cachedProduct) {
          if (!cancelled) {
            setCommercialPerformance(cachedCommercial);
            setProductPerformance(cachedProduct);
            setCommercialLoading(false);
            setCommercialRefreshing(false);
            setProductLoading(false);
            setProductRefreshing(false);
            commercialLoadedRef.current = true;
            productLoadedRef.current = true;
          }
          return;
        }

        if (!commercialLoadedRef.current) {
          setCommercialLoading(true);
        } else {
          setCommercialRefreshing(true);
        }

        if (!productLoadedRef.current) {
          setProductLoading(true);
        } else {
          setProductRefreshing(true);
        }

        if (!serviceRef.current || companyIdRef.current !== companyId) {
          serviceRef.current = await createDashboardAnalyticsService(companyId);
          companyIdRef.current = companyId;
          fixedCacheRef.current.clear();
          commercialCacheRef.current.clear();
          productCacheRef.current.clear();
        }

        let commercialRequest = pendingCommercialRef.current.get(commercialCacheKey);
        if (!commercialRequest) {
          commercialRequest = serviceRef.current.getCommercialPerformance(
            stripProductScopeFilters(filters)
          );
          pendingCommercialRef.current.set(commercialCacheKey, commercialRequest);
        }

        let productRequest = pendingProductRef.current.get(productCacheKey);
        if (!productRequest) {
          productRequest = serviceRef.current.getProductPerformance(filters);
          pendingProductRef.current.set(productCacheKey, productRequest);
        }

        const [commercialData, productData] = await Promise.all([
          commercialRequest.finally(() => {
            pendingCommercialRef.current.delete(commercialCacheKey);
          }),
          productRequest.finally(() => {
            pendingProductRef.current.delete(productCacheKey);
          }),
        ]);

        commercialCacheRef.current.set(commercialCacheKey, commercialData);
        productCacheRef.current.set(productCacheKey, productData);

        if (!cancelled) {
          setCommercialPerformance(commercialData);
          setProductPerformance(productData);
          commercialLoadedRef.current = true;
          productLoadedRef.current = true;
        }
      } catch (error) {
        console.error('Erreur chargement performances filtrées:', error);
        if (!cancelled) {
          if (!commercialLoadedRef.current) {
            setCommercialPerformance(EMPTY_COMMERCIAL_PERFORMANCE);
          }
          if (!productLoadedRef.current) {
            setProductPerformance(EMPTY_PRODUCT_PERFORMANCE);
          }
        }
      } finally {
        if (!cancelled) {
          setCommercialLoading(false);
          setCommercialRefreshing(false);
          setProductLoading(false);
          setProductRefreshing(false);
        }
      }
    };

    void loadFilteredAnalytics();

    return () => {
      cancelled = true;
    };
  }, [filtersRestored, filtersKey, commercialFiltersKey]);

  const value = useMemo(
    () => ({
      keyFigures,
      revenueEvolutionByMode,
      commercialPerformance,
      productPerformance,
      fixedLoading,
      commercialLoading,
      commercialRefreshing,
      productLoading,
      productRefreshing,
    }),
    [
      keyFigures,
      revenueEvolutionByMode,
      commercialPerformance,
      productPerformance,
      fixedLoading,
      commercialLoading,
      commercialRefreshing,
      productLoading,
      productRefreshing,
    ]
  );

  return (
    <DashboardAnalyticsContext.Provider value={value}>{children}</DashboardAnalyticsContext.Provider>
  );
}

export function useDashboardAnalytics() {
  const context = useContext(DashboardAnalyticsContext);
  if (!context) {
    throw new Error('useDashboardAnalytics must be used within DashboardAnalyticsProvider');
  }
  return context;
}
