'use client';

import { useEffect, useMemo, useState } from 'react';

export const RANKING_MAX_BARS = 10;
export const PRODUCT_RANKING_MAX_BARS = 20;
export const RANKING_BAR_RADIUS: [number, number, number, number] = [0, 6, 6, 0];

export const rankingBarChartMargin = { top: 8, right: 8, left: 8, bottom: 8 };

function getRankingBarSize(viewportWidth: number): number {
  if (viewportWidth < 640) return 22;
  if (viewportWidth < 1024) return 25;
  return 28;
}

function getRankingBaseGap(barSize: number): number {
  return Math.max(8, Math.round((barSize / 28) * 10));
}

/** Hauteur de référence calée sur le nombre max de barres (indépendante du nombre affiché). */
export function getReferenceRankingChartHeight(
  barSize: number,
  baseGap: number,
  maxBars: number = RANKING_MAX_BARS
): number {
  const innerHeight = maxBars * barSize + (maxBars - 1) * baseGap;
  return innerHeight + rankingBarChartMargin.top + rankingBarChartMargin.bottom;
}

export type RankingBarLayout = {
  chartHeight: number;
  barSize: number;
  barRadius: typeof RANKING_BAR_RADIUS;
  margin: typeof rankingBarChartMargin;
};

export function useDashboardRankingBarLayout(
  maxBars: number = RANKING_MAX_BARS
): RankingBarLayout {
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return useMemo(() => {
    const barSize = getRankingBarSize(viewportWidth);
    const baseGap = getRankingBaseGap(barSize);

    return {
      chartHeight: getReferenceRankingChartHeight(barSize, baseGap, maxBars),
      barSize,
      barRadius: RANKING_BAR_RADIUS,
      margin: rankingBarChartMargin,
    };
  }, [maxBars, viewportWidth]);
}

export const rankingBarChartProps = {
  layout: 'vertical' as const,
  barCategoryGap: 0,
  barGap: 0,
};
