'use client';

import { DashboardAnalyticsProvider } from '@/components/dashboard/dashboard-analytics-provider';
import { DashboardFilterProvider } from '@/components/dashboard/dashboard-filter-provider';
import { DashboardFilters } from '@/components/dashboard/dashboard-filters';
import { KeyFiguresWidget } from '@/components/dashboard/key-figures-widget';
import { SelectionKeyFiguresWidget } from '@/components/dashboard/selection-key-figures-widget';
import { RevenueEvolutionWidget } from '@/components/dashboard/revenue-evolution-widget';
import { CommercialPerformanceWidget } from '@/components/dashboard/commercial-performance-widget';
import { ProductPerformanceWidget } from '@/components/dashboard/product-performance-widget';
import { Loader2, LayoutDashboard } from 'lucide-react';
import { useDashboardFilters } from '@/components/dashboard/dashboard-filter-provider';
import { useDashboardAnalytics } from '@/components/dashboard/dashboard-analytics-provider';

function DashboardInitialLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
    </div>
  );
}

function DashboardContent() {
  const { filtersRestored, optionsLoading } = useDashboardFilters();
  const { fixedLoading, commercialLoading, productLoading } = useDashboardAnalytics();
  const isInitialLoading =
    !filtersRestored || optionsLoading || fixedLoading || commercialLoading || productLoading;

  if (isInitialLoading) {
    return <DashboardInitialLoader />;
  }

  return (
    <div className="space-y-6">
      <KeyFiguresWidget />
      <RevenueEvolutionWidget />
      <DashboardFilters />
      <SelectionKeyFiguresWidget />
      <CommercialPerformanceWidget />
      <ProductPerformanceWidget />
    </div>
  );
}

export function DashboardClientPage() {
  return (
    <DashboardFilterProvider>
      <DashboardAnalyticsProvider>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="container mx-auto max-w-6xl px-4 py-8">
            <div className="mb-6 text-center">
              <h1 className="text-3xl font-bold text-slate-900">Tableau de bord</h1>
              <p className="mt-1 flex items-center justify-center gap-2 text-slate-600">
                <LayoutDashboard className="h-4 w-4" />
                Statistiques et performance commerciale
              </p>
            </div>

            <DashboardContent />
          </div>
        </div>
      </DashboardAnalyticsProvider>
    </DashboardFilterProvider>
  );
}
