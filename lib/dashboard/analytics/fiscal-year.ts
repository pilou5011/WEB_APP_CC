import { addDays, parseISO, subYears } from 'date-fns';
import type { FiscalYearBounds, FiscalYearConfig } from './types';
import { toDateString } from './date-utils';

const DEFAULT_FISCAL_CONFIG: FiscalYearConfig = {
  endMonth: 12,
  endDay: 31,
};

export const ALL_FISCAL_YEARS_LABEL = 'Tous les exercices';

function formatFiscalYearLabel(startYear: number, endYear: number): string {
  return startYear === endYear ? `${startYear}` : `${startYear}/${endYear}`;
}

export function normalizeFiscalYearConfig(
  endMonth: number | null | undefined,
  endDay: number | null | undefined
): FiscalYearConfig {
  const month =
    typeof endMonth === 'number' && endMonth >= 1 && endMonth <= 12
      ? endMonth
      : DEFAULT_FISCAL_CONFIG.endMonth;
  const day =
    typeof endDay === 'number' && endDay >= 1 && endDay <= 31
      ? endDay
      : DEFAULT_FISCAL_CONFIG.endDay;
  return { endMonth: month, endDay: day };
}

function fiscalYearEndDate(year: number, config: FiscalYearConfig): Date {
  return new Date(year, config.endMonth - 1, config.endDay);
}

/**
 * Retourne l'exercice comptable contenant la date de référence.
 * Ex. clôture 30/06 : l'exercice 2025/2026 va du 01/07/2025 au 30/06/2026.
 */
export function getFiscalYearContaining(
  referenceDate: Date,
  config: FiscalYearConfig = DEFAULT_FISCAL_CONFIG
): FiscalYearBounds {
  const year = referenceDate.getFullYear();
  let fiscalEnd = fiscalYearEndDate(year, config);

  if (referenceDate > fiscalEnd) {
    fiscalEnd = fiscalYearEndDate(year + 1, config);
  }

  const fiscalStart = addDays(fiscalYearEndDate(fiscalEnd.getFullYear() - 1, config), 1);
  const startYear = fiscalStart.getFullYear();
  const endYear = fiscalEnd.getFullYear();

  return {
    start: fiscalStart,
    end: fiscalEnd,
    label: formatFiscalYearLabel(startYear, endYear),
  };
}

export function getPreviousFiscalYear(bounds: FiscalYearBounds): FiscalYearBounds {
  const prevStart = subYears(bounds.start, 1);
  const prevEnd = subYears(bounds.end, 1);
  const startYear = prevStart.getFullYear();
  const endYear = prevEnd.getFullYear();

  return {
    start: prevStart,
    end: prevEnd,
    label: formatFiscalYearLabel(startYear, endYear),
  };
}

export function getFiscalYearToDateRange(
  referenceDate: Date,
  config: FiscalYearConfig
): { start: string; end: string; bounds: FiscalYearBounds } {
  const bounds = getFiscalYearContaining(referenceDate, config);
  const effectiveEnd = referenceDate <= bounds.end ? referenceDate : bounds.end;
  return {
    start: toDateString(bounds.start),
    end: toDateString(effectiveEnd),
    bounds,
  };
}

export function getPreviousFiscalYearSamePeriodRange(
  referenceDate: Date,
  config: FiscalYearConfig
): { start: string; end: string } {
  const bounds = getFiscalYearContaining(referenceDate, config);
  const prevBounds = getPreviousFiscalYear(bounds);
  const effectiveEnd = referenceDate <= bounds.end ? referenceDate : bounds.end;
  const elapsedDays = Math.floor(
    (effectiveEnd.getTime() - bounds.start.getTime()) / (1000 * 60 * 60 * 24)
  );
  const prevEffectiveEnd = addDays(prevBounds.start, elapsedDays);
  const cappedEnd = prevEffectiveEnd > prevBounds.end ? prevBounds.end : prevEffectiveEnd;

  return {
    start: toDateString(prevBounds.start),
    end: toDateString(cappedEnd),
  };
}

/** Exercice dont la date de fin correspond à la clé (YYYY-MM-DD). */
export function getFiscalYearByEndKey(
  fiscalYearEndKey: string,
  config: FiscalYearConfig
): FiscalYearBounds {
  const fiscalEnd = parseISO(fiscalYearEndKey);
  const fiscalStart = addDays(fiscalYearEndDate(fiscalEnd.getFullYear() - 1, config), 1);
  const startYear = fiscalStart.getFullYear();
  const endYear = fiscalEnd.getFullYear();

  return {
    start: fiscalStart,
    end: fiscalEnd,
    label: formatFiscalYearLabel(startYear, endYear),
  };
}

export function listSelectableFiscalYears(
  referenceDate: Date,
  config: FiscalYearConfig,
  count = 6
): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [];
  let bounds = getFiscalYearContaining(referenceDate, config);

  for (let i = 0; i < count; i++) {
    options.push({
      value: toDateString(bounds.end),
      label: bounds.label,
    });
    bounds = getPreviousFiscalYear(bounds);
  }

  return options.reverse();
}

/**
 * Plage couvrant tous les exercices proposés dans le sélecteur (du plus ancien à la date de référence).
 */
export function getAllFiscalYearsDateRange(
  referenceDate: Date,
  config: FiscalYearConfig,
  selectableCount = 6
): { start: string; end: string; label: string } {
  const options = listSelectableFiscalYears(referenceDate, config, selectableCount);

  if (options.length === 0) {
    const bounds = getFiscalYearContaining(referenceDate, config);
    return {
      start: toDateString(bounds.start),
      end: toDateString(referenceDate),
      label: ALL_FISCAL_YEARS_LABEL,
    };
  }

  const oldestBounds = getFiscalYearByEndKey(options[0].value, config);

  return {
    start: toDateString(oldestBounds.start),
    end: toDateString(referenceDate),
    label: ALL_FISCAL_YEARS_LABEL,
  };
}
