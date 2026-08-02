'use client';

import { Loader2, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardFilterMultiSelect } from '@/components/dashboard/dashboard-filter-multi-select';
import { useDashboardFilters } from '@/components/dashboard/dashboard-filter-provider';
import { useDashboardAnalytics } from '@/components/dashboard/dashboard-analytics-provider';
import { ProductQuantityRankingChart } from '@/components/dashboard/product-quantity-ranking-chart';
import { formatDashboardCurrency } from '@/lib/dashboard';

function formatDisplayDate(date: string): string {
  const [year, month, day] = date.split('-');
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
}

export function ProductPerformanceWidget() {
  const {
    filters,
    linkedOptions,
    optionsLoading,
    filterScopeLoading,
    setProductIds,
    setCategoryIds,
    setSubcategoryIds,
  } = useDashboardFilters();
  const { productPerformance, productLoading, productRefreshing } = useDashboardAnalytics();
  const filtersDisabled = optionsLoading || filterScopeLoading;

  return (
    <Card id="perf_prod" className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="h-5 w-5 text-amber-600" />
          Performance produits
          {productRefreshing && !productLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          )}
        </CardTitle>
        <CardDescription>
          Analyses des ventes produits selon les filtres sélectionnés
          {productPerformance.fiscalYearLabel
            ? ` — exercice ${productPerformance.fiscalYearLabel}`
            : ''}
          {productPerformance.effectiveRange.start && productPerformance.effectiveRange.end && (
            <>
              {' '}
              ({formatDisplayDate(productPerformance.effectiveRange.start)} →{' '}
              {formatDisplayDate(productPerformance.effectiveRange.end)})
            </>
          )}
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <DashboardFilterMultiSelect
            label="Produits"
            placeholder="Tous les produits"
            searchPlaceholder="Rechercher un produit..."
            options={linkedOptions.products}
            selectedValues={filters.productIds}
            onChange={setProductIds}
            disabled={filtersDisabled}
          />
          <DashboardFilterMultiSelect
            label="Catégorie"
            placeholder="Toutes les catégories"
            searchPlaceholder="Rechercher une catégorie..."
            options={linkedOptions.categories}
            selectedValues={filters.categoryIds}
            onChange={setCategoryIds}
            disabled={filtersDisabled}
          />
          <DashboardFilterMultiSelect
            label="Sous-catégorie"
            placeholder="Toutes les sous-catégories"
            searchPlaceholder="Rechercher une sous-catégorie..."
            options={linkedOptions.subcategories}
            selectedValues={filters.subcategoryIds}
            onChange={setSubcategoryIds}
            disabled={filtersDisabled}
          />
        </div>

        {productLoading ? (
          <div className="flex min-h-[12rem] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-600">
              <p>
                <span className="font-medium text-slate-900">{productPerformance.productCount}</span>{' '}
                produit(s) dans la sélection —{' '}
                <span className="font-medium text-slate-900">
                  {productPerformance.totalQuantity.toLocaleString('fr-FR')}
                </span>{' '}
                unité(s) vendue(s) — CA HT{' '}
                <span className="font-medium text-slate-900">
                  {formatDashboardCurrency(productPerformance.totalRevenueHt)}
                </span>
                .
              </p>
            </div>
            <ProductQuantityRankingChart data={productPerformance.productQuantityRanking} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
