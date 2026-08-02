import type { DashboardCustomerRankingMode } from '../types';

import type { ClientSummary, RevenueDocument } from './types';

import { isDateInRange } from './date-utils';

import {

  buildVisitDatesByClient,

  computeClientTimeSpentHours,

  getAverageTimeInHours,

} from './time-spent';



const TOP_BOTTOM_LIMIT = 10;



type RevenuePerHourRow = {

  clientId: string;

  clientName: string;

  revenuePerHour: number;

  revenue: number;

  totalVisits: number;

  totalHours: number;

  rank: number;

};



export function buildRevenuePerHourRanking(

  clients: ClientSummary[],

  documents: RevenueDocument[],

  effectiveRange: { start: string; end: string },

  rankingMode: DashboardCustomerRankingMode

): {

  limit: number;

  totalMatchingClients: number;

  usesFallback: boolean;

  items: RevenuePerHourRow[];

} {

  const inRangeDocuments = documents.filter((doc) =>

    isDateInRange(doc.document_date, effectiveRange)

  );



  const revenueByClient = new Map<string, number>();

  for (const document of inRangeDocuments) {

    const sign = document.type === 'credit_note' ? -1 : 1;

    revenueByClient.set(

      document.client_id,

      (revenueByClient.get(document.client_id) ?? 0) + sign * document.amount_ht

    );

  }



  const visitDatesByClient = buildVisitDatesByClient(documents, effectiveRange);



  const rows = clients

    .map((client) => {

      const averageHours = getAverageTimeInHours(client);

      if (averageHours <= 0) return null;



      const totalVisits = visitDatesByClient.get(client.id)?.size ?? 0;

      if (totalVisits <= 0) return null;



      const totalHours = computeClientTimeSpentHours(client, visitDatesByClient);

      if (totalHours === null || totalHours <= 0) return null;



      const revenue = revenueByClient.get(client.id) ?? 0;

      const revenuePerHour = revenue / totalHours;



      return {

        clientId: client.id,

        clientName: client.name,

        revenuePerHour,

        revenue,

        totalVisits,

        totalHours,

      };

    })

    .filter((row): row is Omit<RevenuePerHourRow, 'rank'> => row !== null);



  const sortedRows = [...rows].sort((a, b) =>

    rankingMode === 'top' ? b.revenuePerHour - a.revenuePerHour : a.revenuePerHour - b.revenuePerHour

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


