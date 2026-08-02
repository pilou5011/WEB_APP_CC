import type { CommercialPerformanceData, DashboardFilters, SelectionKeyFiguresData } from '../types';
import type { ClientSummary, DateRange, RevenueDocument } from './types';
import { fetchClientSummaries, resolveFilteredClientIds } from './data-access';
import { buildCustomerRevenueRanking } from './revenue-by-customer';
import { buildRevenuePerHourRanking } from './revenue-per-hour';
import { buildRevenuePerVisitRanking } from './revenue-per-visit';

/**
 * Résout la liste des clients éligibles selon les filtres cumulables
 * (Clients, Département, Type d'établissement, Tournée).
 */
export async function resolveCommercialPerformanceClients(
  companyId: string,
  filters: DashboardFilters,
  resolvedClientIds?: string[] | null
): Promise<ClientSummary[]> {
  const clientIds =
    resolvedClientIds !== undefined
      ? resolvedClientIds
      : await resolveFilteredClientIds(companyId, filters);
  return fetchClientSummaries(companyId, clientIds);
}

/** Restreint les documents aux clients filtrés avant tout calcul. */
export function filterRevenueDocumentsToClients(
  documents: RevenueDocument[],
  clients: ClientSummary[]
): RevenueDocument[] {
  if (clients.length === 0) {
    return [];
  }

  const clientIds = new Set(clients.map((client) => client.id));
  return documents.filter((document) => clientIds.has(document.client_id));
}

/**
 * Construit les trois graphiques de performance commerciale à partir
 * de la même sélection clients + documents filtrés.
 */
export function buildCommercialPerformanceData(
  clients: ClientSummary[],
  documents: RevenueDocument[],
  effectiveRange: DateRange,
  filters: DashboardFilters,
  fiscalYearLabel: string,
  selectionKeyFigures: SelectionKeyFiguresData
): CommercialPerformanceData {
  const scopedDocuments = filterRevenueDocumentsToClients(documents, clients);

  const customerRevenue = buildCustomerRevenueRanking(
    clients,
    scopedDocuments,
    effectiveRange,
    filters.customerRankingMode
  );
  const revenuePerTime = buildRevenuePerHourRanking(
    clients,
    scopedDocuments,
    effectiveRange,
    filters.customerRankingMode
  );
  const revenuePerVisit = buildRevenuePerVisitRanking(
    clients,
    scopedDocuments,
    effectiveRange,
    filters.customerRankingMode
  );

  return {
    effectiveRange,
    fiscalYearLabel,
    customerRankingMode: filters.customerRankingMode,
    selectionKeyFigures,
    customerRevenue: {
      rankingMode: filters.customerRankingMode,
      ...customerRevenue,
    },
    revenuePerTime: {
      rankingMode: filters.customerRankingMode,
      ...revenuePerTime,
    },
    revenuePerVisit: {
      rankingMode: filters.customerRankingMode,
      ...revenuePerVisit,
    },
  };
}
