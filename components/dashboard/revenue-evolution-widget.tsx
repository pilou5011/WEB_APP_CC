'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { RevenueEvolutionChart } from '@/components/dashboard/revenue-evolution-chart';
import { useDashboardAnalytics } from '@/components/dashboard/dashboard-analytics-provider';
import type { DashboardTimeDisplayMode } from '@/lib/dashboard';

export function RevenueEvolutionWidget() {
  const { revenueEvolutionByMode, fixedLoading } = useDashboardAnalytics();
  const [mode, setMode] = useState<DashboardTimeDisplayMode>('month');

  if (fixedLoading) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <RevenueEvolutionChart
      data={revenueEvolutionByMode[mode]}
      mode={mode}
      onModeChange={setMode}
    />
  );
}
