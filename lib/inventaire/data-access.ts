import { supabase } from '@/lib/supabase';
import { getCurrentUserCompanyId } from '@/lib/auth-helpers';
import {
  buildInventoryMatrix,
  getInventoryEndOfDayIso,
  type InventoryClientProductPrice,
  type InventoryClientRow,
  type InventoryMatrix,
  type InventoryProductRow,
  type InventoryStockUpdateRow,
  type InventorySubProductRow,
} from '@/lib/inventaire/types';

const PAGE_SIZE = 1000;

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: Error | null }>
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  for (;;) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) throw error;
    const chunk = data ?? [];
    all.push(...chunk);
    if (chunk.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

/**
 * Charge toutes les données inventaire du compte connecté et construit la matrice.
 * Inclut clients/produits soft-deleted s'ils existaient à la date.
 * stock_updates : mouvements jusqu'à fin de journée locale inclusive.
 */
export async function loadInventoryMatrixForDate(dateYmd: string): Promise<InventoryMatrix> {
  const companyId = await getCurrentUserCompanyId();
  if (!companyId) {
    throw new Error('Non autorisé');
  }

  const endIso = getInventoryEndOfDayIso(dateYmd);

  const [clients, products, subProducts, stockUpdates, clientProductPrices] = await Promise.all([
    fetchAllRows<InventoryClientRow>(async (from, to) => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, company_name, client_number, created_at')
        .eq('company_id', companyId)
        .lte('created_at', endIso)
        .order('created_at', { ascending: true })
        .range(from, to);
      return { data: data as InventoryClientRow[] | null, error: error as Error | null };
    }),
    fetchAllRows<InventoryProductRow>(async (from, to) => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, created_at')
        .eq('company_id', companyId)
        .lte('created_at', endIso)
        .order('created_at', { ascending: true })
        .range(from, to);
      return { data: data as InventoryProductRow[] | null, error: error as Error | null };
    }),
    fetchAllRows<InventorySubProductRow>(async (from, to) => {
      const { data, error } = await supabase
        .from('sub_products')
        .select('id, product_id, name, created_at')
        .eq('company_id', companyId)
        .lte('created_at', endIso)
        .order('created_at', { ascending: true })
        .range(from, to);
      return { data: data as InventorySubProductRow[] | null, error: error as Error | null };
    }),
    fetchAllRows<InventoryStockUpdateRow>(async (from, to) => {
      const { data, error } = await supabase
        .from('stock_updates')
        .select('client_id, product_id, sub_product_id, new_stock, created_at')
        .eq('company_id', companyId)
        .lte('created_at', endIso)
        .order('created_at', { ascending: false })
        .range(from, to);
      return { data: data as InventoryStockUpdateRow[] | null, error: error as Error | null };
    }),
    // Prix actuels : associations non soft-deleted (prix « actuellement enregistré »)
    fetchAllRows<InventoryClientProductPrice>(async (from, to) => {
      const { data, error } = await supabase
        .from('client_products')
        .select('client_id, product_id, custom_price')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('client_id', { ascending: true })
        .range(from, to);
      return { data: data as InventoryClientProductPrice[] | null, error: error as Error | null };
    }),
  ]);

  return buildInventoryMatrix({
    clients,
    products,
    subProducts,
    stockUpdates,
    clientProductPrices,
    endIso,
  });
}
