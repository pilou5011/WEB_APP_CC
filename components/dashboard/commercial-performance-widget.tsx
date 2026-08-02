'use client';

import { Loader2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardAnalytics } from '@/components/dashboard/dashboard-analytics-provider';
import { RevenueByCustomerChart } from '@/components/dashboard/revenue-by-customer-chart';
import { RevenuePerVisitChart } from '@/components/dashboard/revenue-per-visit-chart';
import { RevenuePerTimeChart } from '@/components/dashboard/revenue-per-time-chart';

function formatDisplayDate(date: string): string {
  const [year, month, day] = date.split('-');
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
}

export function CommercialPerformanceWidget() {
  const { commercialPerformance, commercialLoading, commercialRefreshing } = useDashboardAnalytics();

  return (
    <Card id="perf_com" className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-green-600" />
          Performance commerciale
          {commercialRefreshing && !commercialLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          )}
        </CardTitle>
        <CardDescription>
          Analyses et graphiques de performance selon les filtres sélectionnés
          {commercialPerformance.fiscalYearLabel
            ? ` — exercice ${commercialPerformance.fiscalYearLabel}`
            : ''}
          {commercialPerformance.effectiveRange.start &&
            commercialPerformance.effectiveRange.end && (
              <>
                {' '}
                ({formatDisplayDate(commercialPerformance.effectiveRange.start)} →{' '}
                {formatDisplayDate(commercialPerformance.effectiveRange.end)})
              </>
            )}
          .
        </CardDescription>
      </CardHeader>
      <CardContent>
        {commercialLoading ? (
          <div className="flex min-h-[12rem] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-4">
            <RevenueByCustomerChart data={commercialPerformance.customerRevenue} />
            <RevenuePerTimeChart data={commercialPerformance.revenuePerTime} />
            <RevenuePerVisitChart data={commercialPerformance.revenuePerVisit} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
