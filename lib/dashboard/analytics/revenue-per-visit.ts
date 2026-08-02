import type { DashboardCustomerRankingMode } from '../types';
import type { ClientSummary, RevenueDocument } from './types';
import { isDateInRange } from './date-utils';

const TOP_BOTTOM_LIMIT = 10;

type RevenuePerVisitRow = {
  clientId: string;
  clientName: string;
  revenuePerVisit: number;
  revenue: number;
  totalVisits: number;
  rank: number;
};

export function buildRevenuePerVisitRanking(
  clients: ClientSummary[],
  documents: RevenueDocument[],
  effectiveRange: { start: string; end: string },
  rankingMode: DashboardCustomerRankingMode
): {
  limit: number;
  totalMatchingClients: number;
  usesFallback: boolean;
  items: RevenuePerVisitRow[];
} {
  const inRangeDocuments = documents.filter((doc) =>
    isDateInRange(doc.document_date, effectiveRange)
  );

  const revenueByClient = new Map<string, number>();
  const visitDatesByClient = new Map<string, Set<string>>();

  for (const document of inRangeDocuments) {
    const sign = document.type === 'credit_note' ? -1 : 1;
    revenueByClient.set(
      document.client_id,
      (revenueByClient.get(document.client_id) ?? 0) + sign * document.amount_ht
    );

    if (document.type === 'invoice') {
      if (!visitDatesByClient.has(document.client_id)) {
        visitDatesByClient.set(document.client_id, new Set<string>());
      }
      visitDatesByClient.get(document.client_id)!.add(document.document_date);
    }
  }

  const rows = clients
    .map((client) => {
      const totalVisits = visitDatesByClient.get(client.id)?.size ?? 0;
      if (totalVisits <= 0) return null;

      const revenue = revenueByClient.get(client.id) ?? 0;
      const revenuePerVisit = revenue / totalVisits;

      return {
        clientId: client.id,
        clientName: client.name,
        revenuePerVisit,
        revenue,
        totalVisits,
      };
    })
    .filter((row): row is Omit<RevenuePerVisitRow, 'rank'> => row !== null);

  const sortedRows = [...rows].sort((a, b) =>
    rankingMode === 'top' ? b.revenuePerVisit - a.revenuePerVisit : a.revenuePerVisit - b.revenuePerVisit
  );

  const items = sortedRows.slice(0, TOP_BOTTOM_LIMIT).map((row, index) => ({
    ...row,
    rank: index + 1,
  }));

  return {
    limit: TOP_BOTTOM_LIMIT,
    totalMatchingClients: rows.length,
    usesFallback: rows.length > 0 && rows.length < TOP_BOTTOM_LIMIT,
    items,
  };
}
