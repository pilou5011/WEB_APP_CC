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
  PRODUCT_RANKING_MAX_BARS,
  rankingBarChartProps,
  useDashboardRankingBarLayout,
} from '@/components/dashboard/dashboard-ranking-bar-chart-layout';
import type { DashboardProductRankingLimit, ProductPerformanceData } from '@/lib/dashboard';
import { cn } from '@/lib/utils';

type ProductQuantityRankingChartProps = {
  data: ProductPerformanceData['productQuantityRanking'];
};

const chartConfig = {
  quantity: {
    label: 'Quantité vendue',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

const RANKING_LIMITS: DashboardProductRankingLimit[] = [5, 10, 20];

function truncateProductLabel(name: string): string {
  return name.length > 24 ? `${name.slice(0, 24)}...` : name;
}

function formatQuantity(value: number): string {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
}

function rankingButtonClass(active: boolean, withBorderLeft = false): string {
  return cn(
    'rounded-none h-8 px-3 text-xs',
    withBorderLeft && 'border-l border-slate-300',
    active
      ? 'bg-[#E8EDF2] font-semibold ring-2 ring-inset ring-slate-500'
      : 'bg-slate-100 text-slate-600'
  );
}

export function ProductQuantityRankingChart({ data }: ProductQuantityRankingChartProps) {
  const { filters, setProductRankingMode, setProductRankingLimit } = useDashboardFilters();
  const chartData = useMemo(
    () =>
      data.items.map((item) => ({
        ...item,
        productLabel: truncateProductLabel(item.productName),
      })),
    [data.items]
  );

  const hasData = chartData.length > 0;
  const barLayout = useDashboardRankingBarLayout(PRODUCT_RANKING_MAX_BARS);
  const rankingLabel = filters.productRankingMode === 'top' ? 'Top' : 'Bottom';

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              Quantité vendue ({rankingLabel} {filters.productRankingLimit})
            </CardTitle>
            <CardDescription>
              Classement des produits selon la quantité totale vendue sur la période filtrée.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
              <Button
                type="button"
                variant="ghost"
                className={rankingButtonClass(filters.productRankingMode === 'top')}
                onClick={() => setProductRankingMode('top')}
              >
                Top
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={rankingButtonClass(filters.productRankingMode === 'bottom', true)}
                onClick={() => setProductRankingMode('bottom')}
              >
                Bottom
              </Button>
            </div>
            <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
              {RANKING_LIMITS.map((limit, index) => (
                <Button
                  key={limit}
                  type="button"
                  variant="ghost"
                  className={rankingButtonClass(
                    filters.productRankingLimit === limit,
                    index > 0
                  )}
                  onClick={() => setProductRankingLimit(limit)}
                >
                  {limit}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto w-full"
          style={{ height: barLayout.chartHeight }}
        >
          <BarChart data={chartData} {...rankingBarChartProps} margin={barLayout.margin}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis
              type="category"
              dataKey="productLabel"
              width={120}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatQuantity(Number(value ?? 0))}
                  labelFormatter={(_label, payload) => payload?.[0]?.payload?.productName ?? ''}
                />
              }
            />
            <Bar
              dataKey="quantity"
              name="quantity"
              fill="var(--color-quantity)"
              barSize={barLayout.barSize}
              maxBarSize={barLayout.barSize}
              radius={barLayout.barRadius}
            />
          </BarChart>
        </ChartContainer>
        {!hasData && (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
            Aucun produit à afficher pour ce classement.
          </div>
        )}
        <p className="text-xs text-slate-500">
          {data.totalMatchingProducts === 0
            ? 'Aucun produit sur la période filtrée.'
            : data.usesFallback
              ? `${data.totalMatchingProducts} produit(s) — moins de ${data.limit}, tous seront affichés.`
              : `${data.totalMatchingProducts} produit(s) éligibles — limite ${data.limit}.`}
        </p>
      </CardContent>
    </Card>
  );
}
