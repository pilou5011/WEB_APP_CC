import type { ClientSummary, DateRange, RevenueDocument } from './types';
import { isDateInRange } from './date-utils';

export function getAverageTimeInHours(client: ClientSummary): number {
  const hours = client.averageTimeHours ?? 0;
  const minutes = client.averageTimeMinutes ?? 0;
  return hours + minutes / 60;
}

/** Jours uniques de facturation (factures uniquement) par client, dans la période. */
export function buildVisitDatesByClient(
  documents: RevenueDocument[],
  effectiveRange: DateRange
): Map<string, Set<string>> {
  const visitDatesByClient = new Map<string, Set<string>>();

  for (const document of documents) {
    if (document.type !== 'invoice' || !isDateInRange(document.document_date, effectiveRange)) {
      continue;
    }

    if (!visitDatesByClient.has(document.client_id)) {
      visitDatesByClient.set(document.client_id, new Set<string>());
    }
    visitDatesByClient.get(document.client_id)!.add(document.document_date);
  }

  return visitDatesByClient;
}

/**
 * Temps passé pour un client : visites uniques × temps moyen.
 * Retourne `null` si temps moyen absent ou aucune visite.
 */
export function computeClientTimeSpentHours(
  client: ClientSummary,
  visitDatesByClient: Map<string, Set<string>>
): number | null {
  const averageHours = getAverageTimeInHours(client);
  if (averageHours <= 0) {
    return null;
  }

  const totalVisits = visitDatesByClient.get(client.id)?.size ?? 0;
  if (totalVisits <= 0) {
    return null;
  }

  const totalHours = totalVisits * averageHours;
  return totalHours > 0 ? totalHours : null;
}

/** Somme des temps passés pour une liste de clients (même règles que CA / Temps passé). */
export function aggregateTimeSpentHours(
  clients: ClientSummary[],
  documents: RevenueDocument[],
  effectiveRange: DateRange
): number {
  const visitDatesByClient = buildVisitDatesByClient(documents, effectiveRange);

  return clients.reduce((sum, client) => {
    const hours = computeClientTimeSpentHours(client, visitDatesByClient);
    return hours === null ? sum : sum + hours;
  }, 0);
}
