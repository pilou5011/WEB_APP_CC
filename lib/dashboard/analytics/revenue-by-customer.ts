import type { DashboardCustomerRankingMode } from '../types';
import type { ClientSummary, RevenueDocument } from './types';
import { isDateInRange } from './date-utils';
import { computeRevenueByClient } from './client-revenue';

export type CustomerRevenueRow = {
  clientId: string;
  clientName: string;
  revenueHt: number;
  rank: number;
};

const TOP_BOTTOM_LIMIT = 10;

export function buildCustomerRevenueRanking(
  clients: ClientSummary[],
  documents: RevenueDocument[],
  effectiveRange: { start: string; end: string },
  rankingMode: DashboardCustomerRankingMode
): {
  limit: number;
  totalMatchingClients: number;
  usesFallback: boolean;
  items: CustomerRevenueRow[];
} {
  const inRangeDocuments = documents.filter((doc) =>
    isDateInRange(doc.document_date, effectiveRange)
  );
  const totalsByClient = computeRevenueByClient(inRangeDocuments);

  const scopedRows = clients.map((client) => ({
    clientId: client.id,
    clientName: client.name,
    revenueHt: totalsByClient.get(client.id) ?? 0,
  }));

  const filteredRows =
    rankingMode === 'top' ? scopedRows.filter((row) => row.revenueHt !== 0) : scopedRows;

  const sortedRows = [...filteredRows].sort((a, b) => {
    if (rankingMode === 'top') {
      return b.revenueHt - a.revenueHt;
    }
    return a.revenueHt - b.revenueHt;
  });

  const limitedRows = sortedRows.slice(0, TOP_BOTTOM_LIMIT).map((row, index) => ({
    clientId: row.clientId,
    clientName: row.clientName,
    revenueHt: row.revenueHt,
    rank: index + 1,
  }));

  return {
    limit: TOP_BOTTOM_LIMIT,
    totalMatchingClients: filteredRows.length,
    usesFallback: filteredRows.length > 0 && filteredRows.length < TOP_BOTTOM_LIMIT,
    items: limitedRows,
  };
}
