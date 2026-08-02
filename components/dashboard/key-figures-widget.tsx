'use client';

import { BarChart3, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyFigureCard } from '@/components/dashboard/key-figure-card';
import { useDashboardAnalytics } from '@/components/dashboard/dashboard-analytics-provider';

function getFiscalYearTitle(label: string): string {
  if (!label) return 'CA HT Exercice comptable en cours';
  return `CA HT ${label}`;
}

export function KeyFiguresWidget() {
  const { keyFigures: data, fixedLoading } = useDashboardAnalytics();

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          Chiffres clés
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {fixedLoading ? (
          <div className="flex min-h-[9rem] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <KeyFigureCard
              title="CA HT Aujourd'hui"
              value={data.today.value}
              showComparison={false}
              accent="sky"
            />
            <KeyFigureCard
              title="CA HT Semaine civile"
              value={data.thisWeek.value}
              showComparison={false}
              accent="violet"
            />
            <KeyFigureCard
              title={getFiscalYearTitle(data.fiscalYear.label)}
              value={data.fiscalYear.value}
              comparison={data.fiscalYear}
              comparisonLabel="vs. même date exercice précédent"
              accent="emerald"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
