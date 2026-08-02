import type {
  DashboardCustomerRankingMode,
  DashboardProductRankingLimit,
} from '../types';
import type { DashboardProductCatalogEntry } from './product-catalog';
import type { ProductSalesLine } from './product-sales-access';

export type ProductQuantityRankingRow = {
  productId: string;
  productName: string;
  quantity: number;
  rank: number;
};

export function computeQuantityByProduct(lines: ProductSalesLine[]): Map<string, number> {
  const totals = new Map<string, number>();

  for (const line of lines) {
    totals.set(line.productId, (totals.get(line.productId) ?? 0) + line.quantity);
  }

  return totals;
}

export function buildProductQuantityRanking(
  products: DashboardProductCatalogEntry[],
  lines: ProductSalesLine[],
  rankingMode: DashboardCustomerRankingMode,
  limit: DashboardProductRankingLimit
): {
  rankingMode: DashboardCustomerRankingMode;
  limit: number;
  totalMatchingProducts: number;
  usesFallback: boolean;
  items: ProductQuantityRankingRow[];
} {
  const totalsByProduct = computeQuantityByProduct(lines);

  const scopedRows = products.map((product) => ({
    productId: product.id,
    productName: product.name,
    quantity: totalsByProduct.get(product.id) ?? 0,
  }));

  const filteredRows =
    rankingMode === 'top' ? scopedRows.filter((row) => row.quantity !== 0) : scopedRows;

  const sortedRows = [...filteredRows].sort((a, b) => {
    if (a.quantity !== b.quantity) {
      return rankingMode === 'top' ? b.quantity - a.quantity : a.quantity - b.quantity;
    }

    return a.productId.localeCompare(b.productId);
  });

  const limitedRows = sortedRows.slice(0, limit).map((row, index) => ({
    productId: row.productId,
    productName: row.productName,
    quantity: row.quantity,
    rank: index + 1,
  }));

  return {
    rankingMode,
    limit,
    totalMatchingProducts: filteredRows.length,
    usesFallback: filteredRows.length > 0 && filteredRows.length < limit,
    items: limitedRows,
  };
}
