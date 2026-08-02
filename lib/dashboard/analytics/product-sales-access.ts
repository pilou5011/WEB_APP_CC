import { addSoftDeleteFilter, supabase } from '@/lib/supabase';

export type ProductSalesLine = {
  productId: string;
  clientId: string;
  quantity: number;
  revenueHt: number;
};

async function fetchCompletedInvoiceIds(
  companyId: string,
  rangeStart: string,
  rangeEnd: string,
  clientIds: string[] | null
): Promise<string[]> {
  let query = supabase
    .from('invoices')
    .select('id')
    .eq('company_id', companyId)
    .eq('status', 'completed')
    .gte('invoice_date', rangeStart)
    .lte('invoice_date', rangeEnd);

  if (clientIds !== null) {
    if (clientIds.length === 0) {
      return [];
    }
    query = query.in('client_id', clientIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row: { id: string }) => row.id);
}

export async function fetchClientAssignedProductIds(
  companyId: string,
  clientIds: string[]
): Promise<Set<string>> {
  if (clientIds.length === 0) {
    return new Set();
  }

  const { data, error } = await addSoftDeleteFilter(
    supabase
      .from('client_products')
      .select('product_id')
      .eq('company_id', companyId)
      .in('client_id', clientIds)
      .not('product_id', 'is', null),
    'client_products'
  );

  if (error) throw error;

  return new Set(
    (data ?? [])
      .map((row: { product_id: string | null }) => row.product_id)
      .filter((productId: string | null): productId is string => Boolean(productId))
  );
}

export async function fetchSoldProductIdsInScope(
  companyId: string,
  rangeStart: string,
  rangeEnd: string,
  clientIds: string[] | null
): Promise<Set<string>> {
  const invoiceIds = await fetchCompletedInvoiceIds(companyId, rangeStart, rangeEnd, clientIds);
  if (invoiceIds.length === 0) {
    return new Set();
  }

  const [stockUpdatesResult, directSoldResult] = await Promise.all([
    supabase
      .from('stock_updates')
      .select('product_id')
      .eq('company_id', companyId)
      .in('invoice_id', invoiceIds)
      .not('product_id', 'is', null),
    supabase
      .from('stock_direct_sold')
      .select('product_id')
      .eq('company_id', companyId)
      .in('invoice_id', invoiceIds)
      .not('product_id', 'is', null),
  ]);

  if (stockUpdatesResult.error) throw stockUpdatesResult.error;
  if (directSoldResult.error) throw directSoldResult.error;

  const productIds = new Set<string>();
  for (const row of [...(stockUpdatesResult.data ?? []), ...(directSoldResult.data ?? [])]) {
    const productId = (row as { product_id: string }).product_id;
    if (productId) {
      productIds.add(productId);
    }
  }

  return productIds;
}

export async function resolveSalesScopedProductIds(params: {
  companyId: string;
  rangeStart: string;
  rangeEnd: string;
  clientIds: string[] | null;
  explicitClientIds: string[];
}): Promise<Set<string>> {
  const { companyId, rangeStart, rangeEnd, clientIds, explicitClientIds } = params;

  if (explicitClientIds.length > 0) {
    return fetchClientAssignedProductIds(companyId, explicitClientIds);
  }

  return fetchSoldProductIdsInScope(companyId, rangeStart, rangeEnd, clientIds);
}

export async function fetchProductSalesLines(
  companyId: string,
  rangeStart: string,
  rangeEnd: string,
  clientIds: string[] | null,
  productIds: string[] | null
): Promise<ProductSalesLine[]> {
  const invoiceIds = await fetchCompletedInvoiceIds(companyId, rangeStart, rangeEnd, clientIds);
  if (invoiceIds.length === 0) {
    return [];
  }

  let stockUpdatesQuery = supabase
    .from('stock_updates')
    .select('product_id, client_id, stock_sold, total_amount_ht')
    .eq('company_id', companyId)
    .in('invoice_id', invoiceIds)
    .not('product_id', 'is', null);

  let directSoldQuery = supabase
    .from('stock_direct_sold')
    .select('product_id, client_id, stock_sold, total_amount_ht')
    .eq('company_id', companyId)
    .in('invoice_id', invoiceIds)
    .not('product_id', 'is', null);

  if (productIds !== null) {
    if (productIds.length === 0) {
      return [];
    }
    stockUpdatesQuery = stockUpdatesQuery.in('product_id', productIds);
    directSoldQuery = directSoldQuery.in('product_id', productIds);
  }

  const [stockUpdatesResult, directSoldResult] = await Promise.all([
    stockUpdatesQuery,
    directSoldQuery,
  ]);

  if (stockUpdatesResult.error) throw stockUpdatesResult.error;
  if (directSoldResult.error) throw directSoldResult.error;

  const lines: ProductSalesLine[] = [];

  for (const row of stockUpdatesResult.data ?? []) {
    const line = row as {
      product_id: string;
      client_id: string;
      stock_sold: number | string | null;
      total_amount_ht: number | string | null;
    };
    lines.push({
      productId: line.product_id,
      clientId: line.client_id,
      quantity: Number(line.stock_sold) || 0,
      revenueHt: Number(line.total_amount_ht) || 0,
    });
  }

  for (const row of directSoldResult.data ?? []) {
    const line = row as {
      product_id: string;
      client_id: string;
      stock_sold: number | string | null;
      total_amount_ht: number | string | null;
    };
    lines.push({
      productId: line.product_id,
      clientId: line.client_id,
      quantity: Number(line.stock_sold) || 0,
      revenueHt: Number(line.total_amount_ht) || 0,
    });
  }

  return lines;
}
