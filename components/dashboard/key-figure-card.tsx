'use client';

import { ArrowDown, ArrowUp, CircleHelp, Minus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  formatDashboardCurrency,
  formatDashboardPercent,
  formatDashboardSharePercent,
  type FigureComparison,
} from '@/lib/dashboard';

type KeyFigureAccent = 'sky' | 'violet' | 'emerald';

const accentStyles: Record<
  KeyFigureAccent,
  { card: string; title: string; value: string }
> = {
  sky: {
    card: 'border-sky-200 bg-gradient-to-br from-sky-50/80 to-white',
    title: 'text-sky-800',
    value: 'text-sky-700',
  },
  violet: {
    card: 'border-violet-200 bg-gradient-to-br from-violet-50/80 to-white',
    title: 'text-violet-800',
    value: 'text-violet-700',
  },
  emerald: {
    card: 'border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white',
    title: 'text-emerald-800',
    value: 'text-emerald-700',
  },
};

type KeyFigureCardProps = {
  title: string;
  subtitle?: string;
  value: number;
  comparison?: FigureComparison;
  formatValue?: (value: number) => string;
  comparisonLabel?: string;
  showComparison?: boolean;
  sharePercent?: number | null;
  shareLabel?: string;
  accent?: KeyFigureAccent;
};

function TrendIndicator({ changePercent }: { changePercent: number | null }) {
  if (changePercent === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
        <Minus className="h-3.5 w-3.5" />
        —
      </span>
    );
  }

  const isPositive = changePercent > 0;
  const isNeutral = changePercent === 0;

  if (isNeutral) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
        <Minus className="h-3.5 w-3.5" />
        0 %
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        isPositive ? 'text-green-600' : 'text-red-600'
      )}
    >
      {isPositive ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
      {formatDashboardPercent(changePercent)}
    </span>
  );
}

export function KeyFigureCard({
  title,
  subtitle,
  value,
  comparison,
  formatValue = formatDashboardCurrency,
  comparisonLabel,
  showComparison = true,
  sharePercent,
  shareLabel,
  accent,
}: KeyFigureCardProps) {
  const styles = accent ? accentStyles[accent] : null;

  return (
    <div
      className={cn(
        'h-full rounded-lg border px-3 py-2.5 shadow-sm',
        styles?.card ?? 'border-slate-200 bg-white'
      )}
    >
      <div className="space-y-0.5">
        <p className={cn('text-sm font-semibold', styles?.title ?? 'text-slate-900')}>{title}</p>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <p className={cn('text-xl font-bold leading-none', styles?.value ?? 'text-slate-900')}>
          {formatValue(value)}
        </p>

        {showComparison && comparison && comparisonLabel && (
          <div className="inline-flex items-center gap-1.5">
            <TrendIndicator changePercent={comparison.changePercent} />
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={comparisonLabel}
                    className="inline-flex items-center text-slate-400 hover:text-slate-600"
                  >
                    <CircleHelp className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{comparisonLabel}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      {shareLabel && (
        <p className="mt-1.5 text-xs text-slate-500">
          {sharePercent !== null && sharePercent !== undefined
            ? `${formatDashboardSharePercent(sharePercent)} ${shareLabel}`
            : `— ${shareLabel}`}
        </p>
      )}
    </div>
  );
}
