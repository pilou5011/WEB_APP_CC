import type { DashboardFilters } from '../types';

export type FiscalYearConfig = {
  endMonth: number;
  endDay: number;
};

export type DateRange = {
  start: string;
  end: string;
};

export type AnalyticsQueryParams = {
  filters: DashboardFilters;
  range: DateRange;
  referenceDate?: Date;
};

export type AnalyticsComparisonParams = {
  filters: DashboardFilters;
  currentRange: DateRange;
  previousRange: DateRange;
  referenceDate?: Date;
};

export type ComparisonResult = {
  value: number;
  previousValue: number | null;
  changePercent: number | null;
};

export type RevenueDocumentType = 'invoice' | 'credit_note';

export type RevenueDocument = {
  type: RevenueDocumentType;
  client_id: string;
  amount_ht: number;
  document_date: string;
};

export type ClientSummary = {
  id: string;
  name: string;
  averageTimeHours: number | null;
  averageTimeMinutes: number | null;
};

export type FiscalYearBounds = {
  start: Date;
  end: Date;
  label: string;
};
