'use client';

import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SegmentedTwoOptionToggle } from '@/components/ui/segmented-two-option-toggle';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  formatDashboardCurrency,
  type DashboardTimeDisplayMode,
  type RevenueEvolutionPlaceholder,
} from '@/lib/dashboard';

type RevenueEvolutionChartProps = {
  data: RevenueEvolutionPlaceholder;
  mode: DashboardTimeDisplayMode;
  onModeChange: (mode: DashboardTimeDisplayMode) => void;
};

function buildChartConfig(referenceYear: number): ChartConfig {
  return {
    current: {
      label: String(referenceYear),
      color: 'hsl(var(--chart-1))',
    },
    previous1: {
      label: String(referenceYear - 1),
      color: 'hsl(var(--chart-2))',
    },
    previous2: {
      label: String(referenceYear - 2),
      color: 'hsl(var(--chart-3))',
    },
  };
}

function formatAxisValue(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `${Math.round(value / 100) / 10}k €`;
  }
  return `${Math.round(value)} €`;
}

export function RevenueEvolutionChart({ data, mode, onModeChange }: RevenueEvolutionChartProps) {
  const chartConfig = useMemo(() => buildChartConfig(data.referenceYear), [data.referenceYear]);
  const chartData = useMemo(
    () =>
      data.points.map((point) => ({
        label: point.label,
        current: point.current,
        ...(data.hasPrevious1 ? { previous1: point.previous1 ?? 0 } : {}),
        ...(data.hasPrevious2 ? { previous2: point.previous2 ?? 0 } : {}),
      })),
    [data]
  );

  const hasData =
    chartData.length > 0 &&
    chartData.some(
      (point) =>
        point.current !== 0 ||
        ('previous1' in point && point.previous1 !== 0) ||
        ('previous2' in point && point.previous2 !== 0)
    );

  return (
    <Card id="rev_evo" className="border-slate-200">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Evolution du CA HT</CardTitle>
            <CardDescription>
              CA HT — indépendant des filtres et de l&apos;exercice comptable
            </CardDescription>
          </div>
          <SegmentedTwoOptionToggle
            value={mode}
            onChange={onModeChange}
            leftOption={{ value: 'month', label: 'Mois' }}
            rightOption={{ value: 'week', label: 'Semaines' }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[min(320px,50vh)] w-full min-h-[220px] sm:aspect-[16/9]"
        >
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={mode === 'week' ? 3 : 0}
              minTickGap={mode === 'week' ? 16 : 8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={56}
              tickFormatter={formatAxisValue}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatDashboardCurrency(Number(value))}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              type="monotone"
              dataKey="current"
              name="current"
              stroke="var(--color-current)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
            {data.hasPrevious1 && (
              <Line
                type="monotone"
                dataKey="previous1"
                name="previous1"
                stroke="var(--color-previous1)"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            )}
            {data.hasPrevious2 && (
              <Line
                type="monotone"
                dataKey="previous2"
                name="previous2"
                stroke="var(--color-previous2)"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ChartContainer>
        {!hasData && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Aucune donnée de facturation sur la période — affichage à 0 €.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
