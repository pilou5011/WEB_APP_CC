'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { useDashboardFilters } from '@/components/dashboard/dashboard-filter-provider';
import {
  rankingBarChartProps,
  useDashboardRankingBarLayout,
} from '@/components/dashboard/dashboard-ranking-bar-chart-layout';
import { formatDashboardCurrency, type CommercialPerformanceData } from '@/lib/dashboard';
import { cn } from '@/lib/utils';

type RevenueByCustomerChartProps = {
  data: CommercialPerformanceData['customerRevenue'];
};

const chartConfig = {
  revenueHt: {
    label: 'CA HT',
    color: 'hsl(var(--chart-4))',
  },
} satisfies ChartConfig;

function truncateClientLabel(name: string): string {
  return name.length > 24 ? `${name.slice(0, 24)}...` : name;
}

export function RevenueByCustomerChart({ data }: RevenueByCustomerChartProps) {
  const { filters, setCustomerRankingMode } = useDashboardFilters();
  const chartData = useMemo(
    () =>
      data.items.map((item) => ({
        ...item,
        clientLabel: truncateClientLabel(item.clientName),
      })),
    [data.items]
  );

  const hasData = chartData.length > 0;
  const barLayout = useDashboardRankingBarLayout();

  return (
    <Card id="ca_clients" className="border-slate-200">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">CA Clients (Top / Bottom 10)</CardTitle>
            <CardDescription>
              Classement des clients selon le CA HT sur la période filtrée.
            </CardDescription>
          </div>
          <div className="inline-flex rounded-md border border-slate-300 overflow-hidden">
            <Button
              type="button"
              variant="ghost"
              className={cn(
                'rounded-none h-8 px-3 text-xs',
                filters.customerRankingMode === 'top'
                  ? 'bg-[#E8EDF2] font-semibold ring-2 ring-inset ring-slate-500'
                  : 'bg-slate-100 text-slate-600'
              )}
              onClick={() => setCustomerRankingMode('top')}
            >
              Top 10
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={cn(
                'rounded-none h-8 px-3 text-xs border-l border-slate-300',
                filters.customerRankingMode === 'bottom'
                  ? 'bg-[#E8EDF2] font-semibold ring-2 ring-inset ring-slate-500'
                  : 'bg-slate-100 text-slate-600'
              )}
              onClick={() => setCustomerRankingMode('bottom')}
            >
              Bottom 10
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto w-full"
          style={{ height: barLayout.chartHeight }}
        >
          <BarChart
            data={chartData}
            {...rankingBarChartProps}
            margin={barLayout.margin}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis
              type="category"
              dataKey="clientLabel"
              width={120}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatDashboardCurrency(Number(value ?? 0))}
                  labelFormatter={(_label, payload) => payload?.[0]?.payload?.clientName ?? ''}
                />
              }
            />
            <Bar
              dataKey="revenueHt"
              name="revenueHt"
              fill="var(--color-revenueHt)"
              barSize={barLayout.barSize}
              maxBarSize={barLayout.barSize}
              radius={barLayout.barRadius}
            />
          </BarChart>
        </ChartContainer>
        {!hasData && (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
            Aucun client à afficher pour ce classement.
          </div>
        )}
        <p className="text-xs text-slate-500">
          {data.totalMatchingClients === 0
            ? 'Aucun client sur la période filtrée.'
            : data.usesFallback
              ? `${data.totalMatchingClients} client(s) — moins de 10, tous seront affichés.`
              : `${data.totalMatchingClients} client(s) éligibles — limite ${data.limit}.`}
        </p>
      </CardContent>
    </Card>
  );
}
