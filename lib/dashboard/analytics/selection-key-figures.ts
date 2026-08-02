import type { SelectionKeyFiguresData } from '../types';
import type { ClientSummary, DateRange, RevenueDocument } from './types';
import { computeRevenueHtFromDocuments } from './revenue';
import { aggregateTimeSpentHours } from './time-spent';

function computeSharePercent(part: number, total: number): number | null {
  if (total === 0) {
    return null;
  }
  return (part / total) * 100;
}

/**
 * Synthèse CA HT, clients et temps passé pour la sélection courante,
 * avec parts relatives au périmètre global (même exercice pour le CA et le temps).
 */
export function buildSelectionKeyFigures(params: {
  scopedClients: ClientSummary[];
  totalClientCount: number;
  allClients: ClientSummary[];
  scopedDocuments: RevenueDocument[];
  globalDocuments: RevenueDocument[];
  effectiveRange: DateRange;
  fiscalYearLabel: string;
}): SelectionKeyFiguresData {
  const {
    scopedClients,
    totalClientCount,
    allClients,
    scopedDocuments,
    globalDocuments,
    effectiveRange,
    fiscalYearLabel,
  } = params;

  const revenueHt = computeRevenueHtFromDocuments(scopedDocuments, effectiveRange);
  const globalRevenueHt = computeRevenueHtFromDocuments(globalDocuments, effectiveRange);
  const clientCount = scopedClients.length;
  const timeSpentHours = aggregateTimeSpentHours(scopedClients, scopedDocuments, effectiveRange);
  const globalTimeSpentHours = aggregateTimeSpentHours(allClients, globalDocuments, effectiveRange);

  return {
    revenueHt,
    revenueSharePercent: computeSharePercent(revenueHt, globalRevenueHt),
    clientCount,
    clientSharePercent: computeSharePercent(clientCount, totalClientCount),
    timeSpentHours,
    timeSpentSharePercent: computeSharePercent(timeSpentHours, globalTimeSpentHours),
    fiscalYearLabel,
  };
}
