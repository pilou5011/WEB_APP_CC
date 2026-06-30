import { supabase } from '@/lib/supabase';

/** Années N-3, N-2, N-1 par rapport à l'année courante. */
export function getSalesHistoryYears(): [number, number, number] {
  const currentYear = new Date().getFullYear();
  return [currentYear - 3, currentYear - 2, currentYear - 1];
}

export type ProductSalesByYear = Record<number, number>;

/**
 * Somme des stock_sold par produit et par année (factures completed uniquement).
 */
export async function fetchClientProductSalesByYear(
  clientId: string,
  companyId: string,
  productIds: string[],
  years: number[]
): Promise<Map<string, ProductSalesByYear>> {
  const result = new Map<string, ProductSalesByYear>();
  if (productIds.length === 0 || years.length === 0) return result;

  productIds.forEach((id) => {
    const entry: ProductSalesByYear = {};
    years.forEach((y) => {
      entry[y] = 0;
    });
    result.set(id, entry);
  });

  const { data: completedInvoices } = await supabase
    .from('invoices')
    .select('id')
    .eq('client_id', clientId)
    .eq('company_id', companyId)
    .eq('status', 'completed');

  const completedIds = new Set((completedInvoices || []).map((i) => i.id));
  if (completedIds.size === 0) return result;

  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);

  const { data: updates, error } = await supabase
    .from('stock_updates')
    .select('product_id, stock_sold, created_at, invoice_id')
    .eq('client_id', clientId)
    .eq('company_id', companyId)
    .in('product_id', productIds)
    .is('sub_product_id', null)
    .not('invoice_id', 'is', null);

  if (error) throw error;

  for (const update of updates || []) {
    if (!update.product_id || !update.invoice_id) continue;
    if (!completedIds.has(update.invoice_id)) continue;

    const year = new Date(update.created_at).getFullYear();
    if (year < minYear || year > maxYear) continue;

    const entry = result.get(update.product_id);
    if (!entry || !years.includes(year)) continue;
    entry[year] += update.stock_sold || 0;
  }

  return result;
}
