import type { RevenueDocument } from './types';
import { isDateInRange } from './date-utils';

/**
 * Calcul centralisé du chiffre d'affaires HT :
 * CA HT = Factures (dépôt + compte ferme) HT − Avoirs HT
 */
export function computeRevenueHt(
  invoices: Array<{ amount_ht: number }>,
  creditNotes: Array<{ amount_ht: number }>
): number {
  const invoiceTotal = invoices.reduce((sum, row) => sum + row.amount_ht, 0);
  const creditTotal = creditNotes.reduce((sum, row) => sum + row.amount_ht, 0);
  return invoiceTotal - creditTotal;
}

export function computeRevenueHtFromDocuments(
  documents: RevenueDocument[],
  range: { start: string; end: string }
): number {
  const inRange = documents.filter((doc) => isDateInRange(doc.document_date, range));
  const invoices = inRange.filter((doc) => doc.type === 'invoice');
  const creditNotes = inRange.filter((doc) => doc.type === 'credit_note');
  return computeRevenueHt(invoices, creditNotes);
}

export function countActiveClientsFromDocuments(
  documents: RevenueDocument[],
  range: { start: string; end: string }
): number {
  const clientIds = new Set<string>();
  for (const doc of documents) {
    if (isDateInRange(doc.document_date, range)) {
      clientIds.add(doc.client_id);
    }
  }
  return clientIds.size;
}

export function computeChangePercent(
  current: number,
  previous: number | null
): number | null {
  if (previous === null || previous === 0) {
    return null;
  }
  return ((current - previous) / previous) * 100;
}

export function buildComparisonResult(
  current: number,
  previous: number | null
): { value: number; previousValue: number | null; changePercent: number | null } {
  return {
    value: current,
    previousValue: previous,
    changePercent: computeChangePercent(current, previous),
  };
}
