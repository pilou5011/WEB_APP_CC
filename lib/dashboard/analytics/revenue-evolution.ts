import {
  endOfISOWeek,
  getISOWeeksInYear,
  lastDayOfMonth,
  parseISO,
  setISOWeek,
  startOfISOWeek,
  subYears,
} from 'date-fns';
import type { DashboardTimeDisplayMode } from '../types';
import type { DateRange, RevenueDocument } from './types';
import { computeRevenueHtFromDocuments } from './revenue';
import { isDateInRange, toDateString } from './date-utils';

const MONTH_NAMES = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
] as const;

export type RevenueEvolutionPoint = {
  label: string;
  current: number;
  previous1: number | null;
  previous2: number | null;
};

export type RevenueEvolutionResult = {
  granularity: DashboardTimeDisplayMode;
  comparisonYears: ['N', 'N-1', 'N-2'];
  referenceYear: number;
  hasPrevious1: boolean;
  hasPrevious2: boolean;
  points: RevenueEvolutionPoint[];
};

function intersectRanges(bucket: DateRange, effective: DateRange): DateRange | null {
  const start = bucket.start > effective.start ? bucket.start : effective.start;
  const end = bucket.end < effective.end ? bucket.end : effective.end;
  if (start > end) return null;
  return { start, end };
}

function shiftRangeByYears(range: DateRange, years: number): DateRange {
  return {
    start: toDateString(subYears(parseISO(range.start), years)),
    end: toDateString(subYears(parseISO(range.end), years)),
  };
}

function monthBucketRange(year: number, month: number): DateRange {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = toDateString(lastDayOfMonth(new Date(year, month - 1, 1)));
  return { start, end };
}

function weekBucketRange(year: number, week: number): DateRange {
  const anchor = setISOWeek(new Date(year, 0, 4), week);
  const start = startOfISOWeek(anchor);
  const end = endOfISOWeek(anchor);
  return { start: toDateString(start), end: toDateString(end) };
}

function sumBucket(
  documents: RevenueDocument[],
  bucket: DateRange,
  effectiveRange: DateRange,
  yearShift: number
): number {
  const shiftedEffective = shiftRangeByYears(effectiveRange, yearShift);
  const intersection = intersectRanges(bucket, shiftedEffective);
  if (!intersection) return 0;
  return computeRevenueHtFromDocuments(documents, intersection);
}

function hasYearSeries(
  documents: RevenueDocument[],
  comparisonYear: number,
  referenceYear: number,
  effectiveRange: DateRange
): boolean {
  const yearShift = referenceYear - comparisonYear;
  const shiftedEffective = shiftRangeByYears(effectiveRange, yearShift);
  return documents.some((doc) => isDateInRange(doc.document_date, shiftedEffective));
}

export function getRevenueEvolutionReferenceYear(effectiveRange: DateRange): number {
  return parseISO(effectiveRange.end).getFullYear();
}

export function getRevenueEvolutionLoadStart(
  effectiveRange: DateRange,
  referenceYear: number
): string {
  const earliestComparisonStart = shiftRangeByYears(effectiveRange, 2).start;
  const calendarStart = `${referenceYear - 2}-01-01`;
  return earliestComparisonStart < calendarStart ? earliestComparisonStart : calendarStart;
}

function sumCalendarMonth(
  documents: RevenueDocument[],
  year: number,
  month: number
): number {
  return computeRevenueHtFromDocuments(documents, monthBucketRange(year, month));
}

function sumCalendarWeek(
  documents: RevenueDocument[],
  year: number,
  week: number
): number {
  if (week < 1 || week > getISOWeeksInYear(new Date(year, 6, 1))) {
    return 0;
  }
  return computeRevenueHtFromDocuments(documents, weekBucketRange(year, week));
}

function hasCalendarYearData(documents: RevenueDocument[], year: number): boolean {
  return documents.some((doc) => parseISO(doc.document_date).getFullYear() === year);
}

export function getCivilYearWeekCount(referenceYear: number): number {
  return getISOWeeksInYear(new Date(referenceYear, 6, 1));
}

/**
 * Évolution du CA en année civile (janvier → décembre ou S1 → S52/S53), indépendante de l'exercice comptable et des filtres.
 */
export function buildCivilYearRevenueEvolution(
  documents: RevenueDocument[],
  referenceDate = new Date(),
  granularity: DashboardTimeDisplayMode = 'month'
): RevenueEvolutionResult {
  const referenceYear = referenceDate.getFullYear();
  const hasPrevious1 = hasCalendarYearData(documents, referenceYear - 1);
  const hasPrevious2 = hasCalendarYearData(documents, referenceYear - 2);

  if (granularity === 'week') {
    const weekCount = getCivilYearWeekCount(referenceYear);
    const previous1WeekCount = getCivilYearWeekCount(referenceYear - 1);
    const previous2WeekCount = getCivilYearWeekCount(referenceYear - 2);

    const points: RevenueEvolutionPoint[] = Array.from({ length: weekCount }, (_, index) => {
      const week = index + 1;
      const current = sumCalendarWeek(documents, referenceYear, week);
      const previous1 =
        hasPrevious1 && week <= previous1WeekCount
          ? sumCalendarWeek(documents, referenceYear - 1, week)
          : hasPrevious1
            ? 0
            : null;
      const previous2 =
        hasPrevious2 && week <= previous2WeekCount
          ? sumCalendarWeek(documents, referenceYear - 2, week)
          : hasPrevious2
            ? 0
            : null;

      return { label: `S${week}`, current, previous1, previous2 };
    });

    return {
      granularity: 'week',
      comparisonYears: ['N', 'N-1', 'N-2'],
      referenceYear,
      hasPrevious1,
      hasPrevious2,
      points,
    };
  }

  const points: RevenueEvolutionPoint[] = MONTH_NAMES.map((label, index) => {
    const month = index + 1;
    const current = sumCalendarMonth(documents, referenceYear, month);
    const previous1 = hasPrevious1
      ? sumCalendarMonth(documents, referenceYear - 1, month)
      : null;
    const previous2 = hasPrevious2
      ? sumCalendarMonth(documents, referenceYear - 2, month)
      : null;

    return { label, current, previous1, previous2 };
  });

  return {
    granularity: 'month',
    comparisonYears: ['N', 'N-1', 'N-2'],
    referenceYear,
    hasPrevious1,
    hasPrevious2,
    points,
  };
}

export function getCivilYearEvolutionLoadStart(referenceDate = new Date()): string {
  const referenceYear = referenceDate.getFullYear();
  return `${referenceYear - 2}-01-01`;
}

export function buildRevenueEvolution(
  documents: RevenueDocument[],
  granularity: DashboardTimeDisplayMode,
  referenceYear: number,
  effectiveRange: DateRange
): RevenueEvolutionResult {
  const hasPrevious1 = hasYearSeries(documents, referenceYear - 1, referenceYear, effectiveRange);
  const hasPrevious2 = hasYearSeries(documents, referenceYear - 2, referenceYear, effectiveRange);

  if (granularity === 'week') {
    const points: RevenueEvolutionPoint[] = Array.from({ length: 52 }, (_, index) => {
      const week = index + 1;
      const current = sumBucket(
        documents,
        weekBucketRange(referenceYear, week),
        effectiveRange,
        0
      );
      const previous1 = hasPrevious1
        ? sumBucket(documents, weekBucketRange(referenceYear - 1, week), effectiveRange, 1)
        : null;
      const previous2 = hasPrevious2
        ? sumBucket(documents, weekBucketRange(referenceYear - 2, week), effectiveRange, 2)
        : null;

      return { label: `S${week}`, current, previous1, previous2 };
    });

    return {
      granularity: 'week',
      comparisonYears: ['N', 'N-1', 'N-2'],
      referenceYear,
      hasPrevious1,
      hasPrevious2,
      points,
    };
  }

  const points: RevenueEvolutionPoint[] = MONTH_NAMES.map((label, index) => {
    const month = index + 1;
    const current = sumBucket(documents, monthBucketRange(referenceYear, month), effectiveRange, 0);
    const previous1 = hasPrevious1
      ? sumBucket(documents, monthBucketRange(referenceYear - 1, month), effectiveRange, 1)
      : null;
    const previous2 = hasPrevious2
      ? sumBucket(documents, monthBucketRange(referenceYear - 2, month), effectiveRange, 2)
      : null;

    return { label, current, previous1, previous2 };
  });

  return {
    granularity: 'month',
    comparisonYears: ['N', 'N-1', 'N-2'],
    referenceYear,
    hasPrevious1,
    hasPrevious2,
    points,
  };
}
