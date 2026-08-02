import type {
  DashboardCustomerRankingMode,
  DashboardProductRankingLimit,
  ProductPerformanceData,
} from '../types';
import type { DateRange } from './types';
import type { DashboardProductCatalogEntry } from './product-catalog';
import type { ProductSalesLine } from './product-sales-access';
import { buildProductQuantityRanking } from './product-quantity-ranking';

export function buildProductPerformanceData(params: {
  lines: ProductSalesLine[];
  scopedProducts: DashboardProductCatalogEntry[];
  effectiveRange: DateRange;
  fiscalYearLabel: string;
  rankingMode: DashboardCustomerRankingMode;
  rankingLimit: DashboardProductRankingLimit;
}): ProductPerformanceData {
  const {
    lines,
    scopedProducts,
    effectiveRange,
    fiscalYearLabel,
    rankingMode,
    rankingLimit,
  } = params;

  const productIds = new Set<string>();
  let totalQuantity = 0;
  let totalRevenueHt = 0;

  for (const line of lines) {
    productIds.add(line.productId);
    totalQuantity += line.quantity;
    totalRevenueHt += line.revenueHt;
  }

  const productQuantityRanking = buildProductQuantityRanking(
    scopedProducts,
    lines,
    rankingMode,
    rankingLimit
  );

  return {
    effectiveRange,
    fiscalYearLabel,
    productCount: productIds.size,
    totalQuantity,
    totalRevenueHt,
    productQuantityRanking,
  };
}
