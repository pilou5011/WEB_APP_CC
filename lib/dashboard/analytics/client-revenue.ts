import type { DashboardFilters, DashboardRevenueOperator } from '../types';
import type { DateRange, RevenueDocument } from './types';
import { isDateInRange } from './date-utils';

export function computeRevenueByClient(documents: RevenueDocument[]): Map<string, number> {
  const totals = new Map<string, number>();

  for (const document of documents) {
    const sign = document.type === 'credit_note' ? -1 : 1;
    const nextTotal = (totals.get(document.client_id) ?? 0) + sign * document.amount_ht;
    totals.set(document.client_id, nextTotal);
  }

  return totals;
}

export function computeRevenueByClientInRange(
  documents: RevenueDocument[],
  range: DateRange
): Map<string, number> {
  const inRangeDocuments = documents.filter((document) =>
    isDateInRange(document.document_date, range)
  );
  return computeRevenueByClient(inRangeDocuments);
}

export function isRevenueFilterActive(filters: DashboardFilters): boolean {
  return (
    filters.revenueOperator !== null &&
    filters.revenueAmount !== null &&
    filters.revenueAmount > 0
  );
}

export function matchesRevenueFilter(
  revenueHt: number,
  operator: DashboardRevenueOperator,
  amount: number
): boolean {
  if (operator === 'gt') {
    return revenueHt > amount;
  }
  return revenueHt < amount;
}

export function filterClientIdsByRevenue(
  clientIds: string[],
  revenueByClient: Map<string, number>,
  operator: DashboardRevenueOperator,
  amount: number
): string[] {
  return clientIds.filter((clientId) =>
    matchesRevenueFilter(revenueByClient.get(clientId) ?? 0, operator, amount)
  );
}
