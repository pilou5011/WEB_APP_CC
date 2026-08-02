import type { CommercialPerformanceData, DashboardFilters, DashboardRevenueOperator, KeyFiguresData, ProductPerformanceData, RevenueEvolutionByMode, RevenueEvolutionPlaceholder, SelectionKeyFiguresData } from '../types';
import { DEFAULT_DASHBOARD_FILTERS, stripClientScopeFilters } from '../filters';
import { DashboardFiltersService } from '../filters-service';

import {
  fetchFiscalYearConfig,
  fetchRevenueDocuments,
  fetchClientSummaries,
} from './data-access';

import { resolveEffectiveDateRange } from './filter-resolution';

import {

  getCivilWeekRange,

  getPreviousCivilWeekRange,

  getTodayRange,

  toDateString,

} from './date-utils';

import {

  getFiscalYearToDateRange,

  getPreviousFiscalYearSamePeriodRange,

} from './fiscal-year';

import {

  buildComparisonResult,

  computeRevenueHtFromDocuments,

  countActiveClientsFromDocuments,

} from './revenue';

import {

  buildCivilYearRevenueEvolution,

  getCivilYearEvolutionLoadStart,

} from './revenue-evolution';
import {
  buildCommercialPerformanceData,
  filterRevenueDocumentsToClients,
  resolveCommercialPerformanceClients,
} from './commercial-performance';
import { buildSelectionKeyFigures } from './selection-key-figures';
import { buildProductPerformanceData } from './product-performance';
import {
  fetchProductSalesLines,
  resolveSalesScopedProductIds,
} from './product-sales-access';
import {
  computeRevenueByClientInRange,
  filterClientIdsByRevenue,
} from './client-revenue';
import {
  getClientRevenueCacheKey,
  getOrLoadClientRevenueMap,
} from './client-revenue-cache';

import type {

  AnalyticsComparisonParams,

  AnalyticsQueryParams,

  ComparisonResult,

  DateRange,

  FiscalYearConfig,

  RevenueDocument,

} from './types';



export class DashboardAnalyticsService {

  private fiscalConfig: FiscalYearConfig | null = null;

  private filtersService: DashboardFiltersService | null = null;

  private documentsCache: RevenueDocument[] | null = null;

  private documentsCacheKey: string | null = null;



  private constructor(private readonly companyId: string) {}



  static async create(companyId: string): Promise<DashboardAnalyticsService> {

    const service = new DashboardAnalyticsService(companyId);

    const [fiscalConfig, filtersService] = await Promise.all([

      fetchFiscalYearConfig(companyId),

      DashboardFiltersService.create(companyId),

    ]);

    service.fiscalConfig = fiscalConfig;

    service.filtersService = filtersService;

    return service;

  }



  getFiltersService(): DashboardFiltersService | null {

    return this.filtersService;

  }



  async getFiscalYearConfig(): Promise<FiscalYearConfig> {

    if (!this.fiscalConfig) {

      this.fiscalConfig = await fetchFiscalYearConfig(this.companyId);

    }

    return this.fiscalConfig;

  }



  private invalidateCache(): void {

    this.documentsCache = null;

    this.documentsCacheKey = null;

  }



  private async resolveClientIdsForQuery(filters: DashboardFilters): Promise<string[] | null> {

    const revenueByClient = await this.getClientRevenueByFiscalScope(filters.fiscalYearKey);

    if (this.filtersService) {

      this.filtersService.setClientRevenueMap(revenueByClient);

      return this.filtersService.resolveClientIds(filters);

    }

    return null;

  }



  private async ensureDocumentsLoaded(

    rangeStart: string,

    rangeEnd: string,

    filters: DashboardFilters

  ): Promise<RevenueDocument[]> {

    const cacheKey = `${rangeStart}|${rangeEnd}|${JSON.stringify(filters)}`;



    if (this.documentsCache && this.documentsCacheKey === cacheKey) {

      return this.documentsCache;

    }



    const clientIds = await this.resolveClientIdsForQuery(filters);

    const documents = await fetchRevenueDocuments(

      this.companyId,

      rangeStart,

      rangeEnd,

      clientIds

    );



    this.documentsCache = documents;

    this.documentsCacheKey = cacheKey;

    return documents;

  }



  private buildKeyFiguresFromDocuments(

    documents: RevenueDocument[],

    referenceDate: Date,

    fiscalConfig: FiscalYearConfig

  ): KeyFiguresData {

    const todayRange = getTodayRange(referenceDate);

    const thisWeekRange = getCivilWeekRange(referenceDate);

    const fiscalYearRange = getFiscalYearToDateRange(referenceDate, fiscalConfig);

    const previousFiscalYearRange = getPreviousFiscalYearSamePeriodRange(

      referenceDate,

      fiscalConfig

    );



    const todayRevenue = computeRevenueHtFromDocuments(documents, todayRange);

    const thisWeekRevenue = computeRevenueHtFromDocuments(documents, thisWeekRange);

    const fiscalYearRevenue = computeRevenueHtFromDocuments(documents, {

      start: fiscalYearRange.start,

      end: fiscalYearRange.end,

    });

    const previousFiscalYearRevenue = computeRevenueHtFromDocuments(documents, {

      start: previousFiscalYearRange.start,

      end: previousFiscalYearRange.end,

    });



    return {

      today: { value: todayRevenue },

      thisWeek: { value: thisWeekRevenue },

      fiscalYear: {

        ...buildComparisonResult(fiscalYearRevenue, previousFiscalYearRevenue),

        label: fiscalYearRange.bounds.label,

      },

    };

  }



  private resolveFixedDocumentRange(

    referenceDate: Date,

    fiscalConfig: FiscalYearConfig

  ): { globalStart: string; globalEnd: string } {

    const todayRange = getTodayRange(referenceDate);

    const thisWeekRange = getCivilWeekRange(referenceDate);

    const previousWeekRange = getPreviousCivilWeekRange(referenceDate);

    const fiscalYearRange = getFiscalYearToDateRange(referenceDate, fiscalConfig);

    const previousFiscalYearRange = getPreviousFiscalYearSamePeriodRange(

      referenceDate,

      fiscalConfig

    );

    const civilEvolutionStart = getCivilYearEvolutionLoadStart(referenceDate);

    const referenceYear = referenceDate.getFullYear();

    const civilEvolutionEnd = `${referenceYear}-12-31`;



    const globalStart = [

      todayRange.start,

      thisWeekRange.start,

      previousWeekRange.start,

      fiscalYearRange.start,

      previousFiscalYearRange.start,

      civilEvolutionStart,

    ].sort()[0];



    const globalEnd = [toDateString(referenceDate), civilEvolutionEnd].sort().pop()!;



    return { globalStart, globalEnd };

  }



  private buildFixedDashboardData(

    documents: RevenueDocument[],

    referenceDate: Date,

    fiscalConfig: FiscalYearConfig

  ): { keyFigures: KeyFiguresData; revenueEvolutionByMode: RevenueEvolutionByMode } {

    return {

      keyFigures: this.buildKeyFiguresFromDocuments(documents, referenceDate, fiscalConfig),

      revenueEvolutionByMode: {
        month: buildCivilYearRevenueEvolution(documents, referenceDate, 'month'),
        week: buildCivilYearRevenueEvolution(documents, referenceDate, 'week'),
      },

    };

  }



  private async loadCommercialAnalytics(
    filters: DashboardFilters,
    referenceDate: Date
  ): Promise<CommercialPerformanceData> {
    const fiscalConfig = await this.getFiscalYearConfig();
    const { globalStart, globalEnd, effectiveRange, fiscalYearLabel } =
      this.resolveGlobalDocumentRange(filters, fiscalConfig, referenceDate);

    const globalFilters: DashboardFilters = {
      ...stripClientScopeFilters(filters),
      revenueOperator: null,
      revenueAmount: null,
    };
    const revenueByClient = await this.getClientRevenueByFiscalScope(
      filters.fiscalYearKey,
      referenceDate
    );
    this.filtersService?.setClientRevenueMap(revenueByClient);
    const resolvedClientIds = this.filtersService?.resolveClientIds(filters) ?? null;

    const [documents, globalDocuments, scopedClients, allClients] = await Promise.all([
      this.ensureDocumentsLoaded(globalStart, globalEnd, filters),
      this.ensureDocumentsLoaded(globalStart, globalEnd, globalFilters),
      resolveCommercialPerformanceClients(this.companyId, filters, resolvedClientIds),
      fetchClientSummaries(this.companyId, null),
    ]);

    const scopedDocuments = filterRevenueDocumentsToClients(documents, scopedClients);
    const selectionKeyFigures = buildSelectionKeyFigures({
      scopedClients,
      totalClientCount: allClients.length,
      allClients,
      scopedDocuments,
      globalDocuments,
      effectiveRange,
      fiscalYearLabel,
    });

    return buildCommercialPerformanceData(
      scopedClients,
      documents,
      effectiveRange,
      filters,
      fiscalYearLabel,
      selectionKeyFigures
    );
  }

  private async buildCommercialPerformanceFromDocuments(

    documents: RevenueDocument[],

    filters: DashboardFilters,

    range: DateRange,

    fiscalYearLabel: string

  ): Promise<CommercialPerformanceData> {
    const scopedClients = await resolveCommercialPerformanceClients(this.companyId, filters);
    const scopedDocuments = filterRevenueDocumentsToClients(documents, scopedClients);
    const allClients = await fetchClientSummaries(this.companyId, null);
    const selectionKeyFigures = buildSelectionKeyFigures({
      scopedClients,
      totalClientCount: allClients.length,
      allClients,
      scopedDocuments,
      globalDocuments: documents,
      effectiveRange: range,
      fiscalYearLabel,
    });

    return buildCommercialPerformanceData(
      scopedClients,
      documents,
      range,
      filters,
      fiscalYearLabel,
      selectionKeyFigures
    );

  }



  private resolveGlobalDocumentRange(

    filters: DashboardFilters,

    fiscalConfig: FiscalYearConfig,

    referenceDate: Date

  ): { globalStart: string; globalEnd: string; effectiveRange: DateRange; fiscalYearLabel: string } {

    const { range, fiscalYearLabel } = resolveEffectiveDateRange(

      filters,

      fiscalConfig,

      referenceDate

    );



    const globalStart = range.start;

    const globalEnd = [toDateString(referenceDate), range.end].sort().pop()!;



    return { globalStart, globalEnd, effectiveRange: range, fiscalYearLabel };

  }



  async getRevenue(params: AnalyticsQueryParams): Promise<number> {

    const documents = await this.ensureDocumentsLoaded(

      params.range.start,

      params.range.end,

      params.filters

    );

    return computeRevenueHtFromDocuments(documents, params.range);

  }



  async getRevenueComparison(params: AnalyticsComparisonParams): Promise<ComparisonResult> {

    const [current, previous] = await Promise.all([

      this.getRevenue({

        filters: params.filters,

        range: params.currentRange,

        referenceDate: params.referenceDate,

      }),

      this.getRevenue({

        filters: params.filters,

        range: params.previousRange,

        referenceDate: params.referenceDate,

      }),

    ]);



    return buildComparisonResult(current, previous);

  }



  async getActiveClients(params: AnalyticsQueryParams): Promise<number> {

    const documents = await this.ensureDocumentsLoaded(

      params.range.start,

      params.range.end,

      params.filters

    );

    return countActiveClientsFromDocuments(documents, params.range);

  }



  async getActiveClientsComparison(params: AnalyticsComparisonParams): Promise<ComparisonResult> {

    const [current, previous] = await Promise.all([

      this.getActiveClients({

        filters: params.filters,

        range: params.currentRange,

        referenceDate: params.referenceDate,

      }),

      this.getActiveClients({

        filters: params.filters,

        range: params.previousRange,

        referenceDate: params.referenceDate,

      }),

    ]);



    return buildComparisonResult(current, previous);

  }



  async getFixedDashboardData(

    referenceDate = new Date()

  ): Promise<{ keyFigures: KeyFiguresData; revenueEvolutionByMode: RevenueEvolutionByMode }> {

    const fiscalConfig = await this.getFiscalYearConfig();

    const { globalStart, globalEnd } = this.resolveFixedDocumentRange(referenceDate, fiscalConfig);



    this.invalidateCache();

    const documents = await this.ensureDocumentsLoaded(

      globalStart,

      globalEnd,

      DEFAULT_DASHBOARD_FILTERS

    );



    return this.buildFixedDashboardData(documents, referenceDate, fiscalConfig);

  }



  async getKeyFigures(filters: DashboardFilters, referenceDate = new Date()): Promise<KeyFiguresData> {

    void filters;

    const data = await this.getFixedDashboardData(referenceDate);

    return data.keyFigures;

  }



  async getCommercialPerformance(

    filters: DashboardFilters,

    referenceDate = new Date()

  ): Promise<CommercialPerformanceData> {

    return this.loadCommercialAnalytics(filters, referenceDate);

  }



  async getSelectionKeyFigures(

    filters: DashboardFilters,

    referenceDate = new Date()

  ): Promise<SelectionKeyFiguresData> {

    const data = await this.loadCommercialAnalytics(filters, referenceDate);

    return data.selectionKeyFigures;

  }



  async getClientRevenueByFiscalScope(

    fiscalYearKey: string | null,

    referenceDate = new Date()

  ): Promise<Map<string, number>> {

    const cacheKey = getClientRevenueCacheKey(this.companyId, fiscalYearKey);

    return getOrLoadClientRevenueMap(cacheKey, () =>

      this.loadClientRevenueByFiscalScope(fiscalYearKey, referenceDate)

    );

  }



  filterClientsByRevenue(

    clientIds: string[],

    revenueByClient: Map<string, number>,

    operator: DashboardRevenueOperator,

    amount: number

  ): string[] {

    return filterClientIdsByRevenue(clientIds, revenueByClient, operator, amount);

  }



  async resolveFilteredClients(

    filters: DashboardFilters,

    referenceDate = new Date()

  ): Promise<Awaited<ReturnType<typeof fetchClientSummaries>>> {

    const revenueByClient = await this.getClientRevenueByFiscalScope(

      filters.fiscalYearKey,

      referenceDate

    );

    this.filtersService?.setClientRevenueMap(revenueByClient);

    const clientIds = this.filtersService?.resolveClientIds(filters) ?? null;

    return fetchClientSummaries(this.companyId, clientIds);

  }



  private async syncFilterScope(

    filters: DashboardFilters,

    referenceDate: Date

  ): Promise<void> {

    const revenueByClient = await this.getClientRevenueByFiscalScope(

      filters.fiscalYearKey,

      referenceDate

    );

    this.filtersService?.setClientRevenueMap(revenueByClient);

    const salesScopedProductIds = await this.getSalesScopedProductIds(filters, referenceDate);

    this.filtersService?.setSalesScopedProductIds(salesScopedProductIds);

  }



  async getSalesScopedProductIds(

    filters: DashboardFilters,

    referenceDate = new Date()

  ): Promise<Set<string>> {

    const fiscalConfig = await this.getFiscalYearConfig();

    const { range } = resolveEffectiveDateRange(filters, fiscalConfig, referenceDate);

    const rangeEnd = [toDateString(referenceDate), range.end].sort().pop()!;

    const revenueByClient = await this.getClientRevenueByFiscalScope(

      filters.fiscalYearKey,

      referenceDate

    );

    this.filtersService?.setClientRevenueMap(revenueByClient);

    const clientIds = this.filtersService?.resolveClientIds(filters) ?? null;

    return resolveSalesScopedProductIds({

      companyId: this.companyId,

      rangeStart: range.start,

      rangeEnd,

      clientIds,

      explicitClientIds: filters.clientIds,

    });

  }



  async getProductPerformance(

    filters: DashboardFilters,

    referenceDate = new Date()

  ): Promise<ProductPerformanceData> {

    const fiscalConfig = await this.getFiscalYearConfig();

    const { globalEnd, effectiveRange, fiscalYearLabel } = this.resolveGlobalDocumentRange(

      filters,

      fiscalConfig,

      referenceDate

    );

    await this.syncFilterScope(filters, referenceDate);

    const clientIds = this.filtersService?.resolveClientIds(filters) ?? null;

    const productIds = this.filtersService?.resolveProductIds(filters) ?? null;

    const lines = await fetchProductSalesLines(

      this.companyId,

      effectiveRange.start,

      globalEnd,

      clientIds,

      productIds

    );

    const scopedProducts = this.filtersService?.getScopedProductPool(filters) ?? [];

    return buildProductPerformanceData({

      lines,

      scopedProducts,

      effectiveRange,

      fiscalYearLabel,

      rankingMode: filters.productRankingMode,

      rankingLimit: filters.productRankingLimit,

    });

  }



  private async loadClientRevenueByFiscalScope(

    fiscalYearKey: string | null,

    referenceDate: Date

  ): Promise<Map<string, number>> {

    const fiscalConfig = await this.getFiscalYearConfig();

    const scopeFilters: DashboardFilters = {

      ...DEFAULT_DASHBOARD_FILTERS,

      fiscalYearKey,

    };

    const { range } = resolveEffectiveDateRange(scopeFilters, fiscalConfig, referenceDate);

    const globalStart = range.start;

    const globalEnd = [toDateString(referenceDate), range.end].sort().pop()!;

    const documents = await fetchRevenueDocuments(

      this.companyId,

      globalStart,

      globalEnd,

      null

    );

    return computeRevenueByClientInRange(documents, range);

  }



  async getDashboardData(

    filters: DashboardFilters,

    referenceDate = new Date()

  ): Promise<{

    keyFigures: KeyFiguresData;

    revenueEvolutionByMode: RevenueEvolutionByMode;

    commercialPerformance: CommercialPerformanceData;

  }> {

    const [fixed, commercialPerformance] = await Promise.all([

      this.getFixedDashboardData(referenceDate),

      this.getCommercialPerformance(filters, referenceDate),

    ]);



    return {

      ...fixed,

      commercialPerformance,

    };

  }



  async getCivilYearRevenueEvolution(

    referenceDate = new Date(),

    granularity: DashboardFilters['timeDisplayMode'] = 'month'

  ): Promise<RevenueEvolutionPlaceholder> {

    const data = await this.getFixedDashboardData(referenceDate);

    return data.revenueEvolutionByMode[granularity];

  }



  async getRevenueByPeriod(

    _filters: DashboardFilters,

    granularity: DashboardFilters['timeDisplayMode'],

    referenceDate = new Date()

  ): Promise<RevenueEvolutionPlaceholder> {

    return this.getCivilYearRevenueEvolution(referenceDate, granularity);

  }



  async getInvoices(_params: AnalyticsQueryParams): Promise<unknown[]> {

    return [];

  }



  async getCreditNotes(_params: AnalyticsQueryParams): Promise<unknown[]> {

    return [];

  }



  async getRevenueByCustomer(
    filters: DashboardFilters,
    referenceDate = new Date()
  ): Promise<CommercialPerformanceData['customerRevenue']['items']> {
    const fiscalConfig = await this.getFiscalYearConfig();
    const { globalStart, globalEnd, effectiveRange, fiscalYearLabel } =
      this.resolveGlobalDocumentRange(filters, fiscalConfig, referenceDate);

    this.invalidateCache();
    const documents = await this.ensureDocumentsLoaded(globalStart, globalEnd, filters);
    const commercialPerformance = await this.buildCommercialPerformanceFromDocuments(
      documents,
      filters,
      effectiveRange,
      fiscalYearLabel
    );

    return commercialPerformance.customerRevenue.items;
  }

  async getCustomerRevenue(params: AnalyticsQueryParams): Promise<unknown[]> {
    return this.getRevenueByCustomer(params.filters, params.referenceDate ?? new Date());
  }

  async getRevenuePerHourByCustomer(
    filters: DashboardFilters,
    referenceDate = new Date()
  ): Promise<CommercialPerformanceData['revenuePerTime']['items']> {
    const fiscalConfig = await this.getFiscalYearConfig();
    const { globalStart, globalEnd, effectiveRange, fiscalYearLabel } =
      this.resolveGlobalDocumentRange(filters, fiscalConfig, referenceDate);

    this.invalidateCache();
    const documents = await this.ensureDocumentsLoaded(globalStart, globalEnd, filters);
    const commercialPerformance = await this.buildCommercialPerformanceFromDocuments(
      documents,
      filters,
      effectiveRange,
      fiscalYearLabel
    );

    return commercialPerformance.revenuePerTime.items;
  }

  async getRevenuePerVisitByCustomer(
    filters: DashboardFilters,
    referenceDate = new Date()
  ): Promise<CommercialPerformanceData['revenuePerVisit']['items']> {
    const fiscalConfig = await this.getFiscalYearConfig();
    const { globalStart, globalEnd, effectiveRange, fiscalYearLabel } =
      this.resolveGlobalDocumentRange(filters, fiscalConfig, referenceDate);

    this.invalidateCache();
    const documents = await this.ensureDocumentsLoaded(globalStart, globalEnd, filters);
    const commercialPerformance = await this.buildCommercialPerformanceFromDocuments(
      documents,
      filters,
      effectiveRange,
      fiscalYearLabel
    );

    return commercialPerformance.revenuePerVisit.items;
  }



  async getVisitCount(_params: AnalyticsQueryParams): Promise<number> {

    return 0;

  }



  async getAverageVisitTime(_params: AnalyticsQueryParams): Promise<number | null> {

    return null;

  }



  async getRevenuePerVisit(_params: AnalyticsQueryParams): Promise<number | null> {
    const items = await this.getRevenuePerVisitByCustomer(
      _params.filters,
      _params.referenceDate ?? new Date()
    );
    if (items.length === 0) return null;
    const sum = items.reduce((acc, item) => acc + item.revenuePerVisit, 0);
    return sum / items.length;

  }



  async getRevenuePerHour(_params: AnalyticsQueryParams): Promise<number | null> {
    const items = await this.getRevenuePerHourByCustomer(
      _params.filters,
      _params.referenceDate ?? new Date()
    );
    if (items.length === 0) return null;
    const sum = items.reduce((acc, item) => acc + item.revenuePerHour, 0);
    return sum / items.length;

  }

}



export async function createDashboardAnalyticsService(

  companyId: string

): Promise<DashboardAnalyticsService> {

  return DashboardAnalyticsService.create(companyId);

}



export { computeRevenueHt } from './revenue';


