'use client';

import { BarChart3, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyFigureCard } from '@/components/dashboard/key-figure-card';
import { useDashboardAnalytics } from '@/components/dashboard/dashboard-analytics-provider';
import { formatDashboardHours } from '@/lib/dashboard';

function formatClientCount(count: number): string {
  return count.toLocaleString('fr-FR');
}

export function SelectionKeyFiguresWidget() {
  const { commercialPerformance, commercialLoading, commercialRefreshing } = useDashboardAnalytics();
  const data = commercialPerformance.selectionKeyFigures;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          Chiffres clés de la sélection
          {commercialRefreshing && !commercialLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {commercialLoading ? (
          <div className="flex min-h-[9rem] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <KeyFigureCard
              title="CA HT"
              value={data.revenueHt}
              showComparison={false}
              sharePercent={data.revenueSharePercent}
              shareLabel="du CA global"
              accent="sky"
            />
            <KeyFigureCard
              title="Clients"
              value={data.clientCount}
              formatValue={formatClientCount}
              showComparison={false}
              sharePercent={data.clientSharePercent}
              shareLabel="des clients"
              accent="emerald"
            />
            <KeyFigureCard
              title="Temps passé"
              value={data.timeSpentHours}
              formatValue={formatDashboardHours}
              showComparison={false}
              sharePercent={data.timeSpentSharePercent}
              shareLabel="du temps total"
              accent="violet"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
