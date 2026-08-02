import { format, startOfWeek, endOfWeek, subWeeks, subDays } from 'date-fns';

export function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function getTodayRange(referenceDate: Date = new Date()): { start: string; end: string } {
  const day = toDateString(referenceDate);
  return { start: day, end: day };
}

export function getSameWeekdayPreviousWeek(referenceDate: Date = new Date()): {
  start: string;
  end: string;
} {
  const previous = subDays(referenceDate, 7);
  const day = toDateString(previous);
  return { start: day, end: day };
}

export function getCivilWeekRange(referenceDate: Date = new Date()): { start: string; end: string } {
  const start = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const end = endOfWeek(referenceDate, { weekStartsOn: 1 });
  return { start: toDateString(start), end: toDateString(end) };
}

export function getPreviousCivilWeekRange(referenceDate: Date = new Date()): {
  start: string;
  end: string;
} {
  const previousWeek = subWeeks(referenceDate, 1);
  return getCivilWeekRange(previousWeek);
}

export function isDateInRange(date: string, range: { start: string; end: string }): boolean {
  return date >= range.start && date <= range.end;
}
