/**
 * Types du module Tableau de bord.
 */

export type DashboardTimeDisplayMode = 'month' | 'week';
export type DashboardCustomerRankingMode = 'top' | 'bottom';
export type DashboardProductRankingLimit = 5 | 10 | 20;
export type DashboardRevenueOperator = 'gt' | 'lt';

export type DashboardFilters = {
  clientIds: string[];
  departments: string[];
  establishmentTypeIds: string[];
  tourIds: string[];
  /** Date de fin d'exercice (YYYY-MM-DD) ; null = tous les exercices */
  fiscalYearKey: string | null;
  /** Opérateur du filtre CA HT ; null = filtre inactif */
  revenueOperator: DashboardRevenueOperator | null;
  /** Montant du filtre CA HT (> 0) ; null = filtre inactif */
  revenueAmount: number | null;
  productIds: string[];
  categoryIds: string[];
  subcategoryIds: string[];
  timeDisplayMode: DashboardTimeDisplayMode;
  customerRankingMode: DashboardCustomerRankingMode;
  productRankingMode: DashboardCustomerRankingMode;
  productRankingLimit: DashboardProductRankingLimit;
};

export type ProductPerformanceData = {
  effectiveRange: { start: string; end: string };
  fiscalYearLabel: string;
  productCount: number;
  totalQuantity: number;
  totalRevenueHt: number;
  productQuantityRanking: ProductQuantityRankingPlaceholder;
};

export type ProductQuantityRankingPlaceholderItem = {
  productId: string;
  productName: string;
  quantity: number;
  rank: number;
};

export type ProductQuantityRankingPlaceholder = {
  rankingMode: DashboardCustomerRankingMode;
  limit: number;
  items: ProductQuantityRankingPlaceholderItem[];
  totalMatchingProducts: number;
  usesFallback: boolean;
};

export const EMPTY_PRODUCT_QUANTITY_RANKING: ProductQuantityRankingPlaceholder = {
  rankingMode: 'top',
  limit: 10,
  items: [],
  totalMatchingProducts: 0,
  usesFallback: false,
};

export const EMPTY_PRODUCT_PERFORMANCE: ProductPerformanceData = {
  effectiveRange: { start: '', end: '' },
  fiscalYearLabel: '',
  productCount: 0,
  totalQuantity: 0,
  totalRevenueHt: 0,
  productQuantityRanking: EMPTY_PRODUCT_QUANTITY_RANKING,
};

export type FigureComparison = {
  value: number;
  previousValue: number | null;
  changePercent: number | null;
};

export type KeyFigureValue = {
  value: number;
};

export type KeyFiguresData = {
  today: KeyFigureValue;
  thisWeek: KeyFigureValue;
  fiscalYear: FigureComparison & { label: string };
};

export const EMPTY_KEY_FIGURES: KeyFiguresData = {
  today: { value: 0 },
  thisWeek: { value: 0 },
  fiscalYear: { value: 0, previousValue: 0, changePercent: null, label: '' },
};

export type SelectionKeyFiguresData = {
  revenueHt: number;
  revenueSharePercent: number | null;
  clientCount: number;
  clientSharePercent: number | null;
  timeSpentHours: number;
  timeSpentSharePercent: number | null;
  fiscalYearLabel: string;
};

export const EMPTY_SELECTION_KEY_FIGURES: SelectionKeyFiguresData = {
  revenueHt: 0,
  revenueSharePercent: null,
  clientCount: 0,
  clientSharePercent: null,
  timeSpentHours: 0,
  timeSpentSharePercent: null,
  fiscalYearLabel: '',
};

export type RevenueEvolutionPlaceholder = {
  granularity: DashboardTimeDisplayMode;
  comparisonYears: ['N', 'N-1', 'N-2'];
  referenceYear: number;
  hasPrevious1: boolean;
  hasPrevious2: boolean;
  points: Array<{
    label: string;
    current: number;
    previous1: number | null;
    previous2: number | null;
  }>;
};

export type CustomerRevenuePlaceholderItem = {
  clientId: string;
  clientName: string;
  revenueHt: number;
  rank: number;
};

export type CustomerRevenuePlaceholder = {
  rankingMode: DashboardCustomerRankingMode;
  limit: number;
  items: CustomerRevenuePlaceholderItem[];
  totalMatchingClients: number;
  usesFallback: boolean;
};

export type RevenuePerTimePlaceholder = {
  rankingMode: DashboardCustomerRankingMode;
  limit: number;
  items: Array<{
    clientId: string;
    clientName: string;
    revenuePerHour: number;
    revenue: number;
    totalVisits: number;
    totalHours: number;
    rank: number;
  }>;
  totalMatchingClients: number;
  usesFallback: boolean;
};

export type RevenuePerVisitPlaceholder = {
  rankingMode: DashboardCustomerRankingMode;
  limit: number;
  items: Array<{
    clientId: string;
    clientName: string;
    revenuePerVisit: number;
    revenue: number;
    totalVisits: number;
    rank: number;
  }>;
  totalMatchingClients: number;
  usesFallback: boolean;
};

export type CommercialPerformanceData = {
  effectiveRange: { start: string; end: string };
  fiscalYearLabel: string;
  customerRankingMode: DashboardCustomerRankingMode;
  selectionKeyFigures: SelectionKeyFiguresData;
  customerRevenue: CustomerRevenuePlaceholder;
  revenuePerTime: RevenuePerTimePlaceholder;
  revenuePerVisit: RevenuePerVisitPlaceholder;
};

export type RevenueEvolutionByMode = {
  month: RevenueEvolutionPlaceholder;
  week: RevenueEvolutionPlaceholder;
};

export const EMPTY_REVENUE_EVOLUTION: RevenueEvolutionPlaceholder = {
  granularity: 'month',
  comparisonYears: ['N', 'N-1', 'N-2'],
  referenceYear: new Date().getFullYear(),
  hasPrevious1: false,
  hasPrevious2: false,
  points: [],
};

export const EMPTY_REVENUE_EVOLUTION_BY_MODE: RevenueEvolutionByMode = {
  month: EMPTY_REVENUE_EVOLUTION,
  week: {
    ...EMPTY_REVENUE_EVOLUTION,
    granularity: 'week',
  },
};

export const EMPTY_COMMERCIAL_PERFORMANCE: CommercialPerformanceData = {
  effectiveRange: { start: '', end: '' },
  fiscalYearLabel: '',
  customerRankingMode: 'top',
  selectionKeyFigures: EMPTY_SELECTION_KEY_FIGURES,
  customerRevenue: {
    rankingMode: 'top',
    limit: 10,
    items: [],
    totalMatchingClients: 0,
    usesFallback: false,
  },
  revenuePerTime: {
    rankingMode: 'top',
    limit: 10,
    items: [],
    totalMatchingClients: 0,
    usesFallback: false,
  },
  revenuePerVisit: {
    rankingMode: 'top',
    limit: 10,
    items: [],
    totalMatchingClients: 0,
    usesFallback: false,
  },
};

export function formatDashboardCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDashboardPercent(percent: number): string {
  const rounded = Math.round(percent * 10) / 10;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;
}

export function formatDashboardSharePercent(percent: number): string {
  const rounded = Math.round(percent * 10) / 10;
  return `${rounded.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;
}

export function formatDashboardHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} h`;
}
