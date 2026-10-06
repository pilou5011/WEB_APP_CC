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

/** Retraite @ Fonds de Rayon — id observé dans les logs (latestStock null). */
const DEBUG_RETRAITE_SUB_ID = '17365c7f-7b18-4a9e-8337-b47ce378fc6d';

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
 * Charge les données inventaire et construit la matrice.
 * Stock = logique Facturer (dépôt) : dernier new_stock effectif
 * (invoice_id null OU facture completed), borné à fin de journée.
 *
 * Important : tout `.range()` doit être couplé à un ordre **stable**
 * (ex. created_at + id). Sinon, les salves d'association avec le même
 * `created_at` perdent des lignes entre pages (ex. Retraite → stock null).
 */
export async function loadInventoryMatrixForDate(dateYmd: string): Promise<InventoryMatrix> {
  const companyId = await getCurrentUserCompanyId();
  if (!companyId) {
    throw new Error('Non autorisé');
  }

  const endIso = getInventoryEndOfDayIso(dateYmd);

  const [clients, products, subProducts, stockUpdates, clientProductPrices, completedInvoices] =
    await Promise.all([
      fetchAllRows<InventoryClientRow>(async (from, to) => {
        const { data, error } = await supabase
          .from('clients')
          .select('id, name, company_name, client_number, created_at, deleted_at')
          .eq('company_id', companyId)
          .lte('created_at', endIso)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to);
        return { data: data as InventoryClientRow[] | null, error: error as Error | null };
      }),
      fetchAllRows<InventoryProductRow>(async (from, to) => {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, price, created_at, deleted_at')
          .eq('company_id', companyId)
          .lte('created_at', endIso)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to);
        return { data: data as InventoryProductRow[] | null, error: error as Error | null };
      }),
      fetchAllRows<InventorySubProductRow>(async (from, to) => {
        const { data, error } = await supabase
          .from('sub_products')
          .select('id, product_id, name, created_at, deleted_at')
          .eq('company_id', companyId)
          .lte('created_at', endIso)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to);
        return { data: data as InventorySubProductRow[] | null, error: error as Error | null };
      }),
      fetchAllRows<InventoryStockUpdateRow>(async (from, to) => {
        const { data, error } = await supabase
          .from('stock_updates')
          .select('id, client_id, product_id, sub_product_id, new_stock, created_at, invoice_id')
          .eq('company_id', companyId)
          .lte('created_at', endIso)
          // Tie-breaker id obligatoire : beaucoup de lignes partagent le même created_at
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);
        return { data: data as InventoryStockUpdateRow[] | null, error: error as Error | null };
      }),
      fetchAllRows<InventoryClientProductPrice>(async (from, to) => {
        const { data, error } = await supabase
          .from('client_products')
          .select('client_id, product_id, custom_price, created_at, deleted_at')
          .eq('company_id', companyId)
          .order('client_id', { ascending: true })
          .order('product_id', { ascending: true })
          .order('created_at', { ascending: true })
          .range(from, to);
        return { data: data as InventoryClientProductPrice[] | null, error: error as Error | null };
      }),
      fetchAllRows<{ id: string }>(async (from, to) => {
        const { data, error } = await supabase
          .from('invoices')
          .select('id')
          .eq('company_id', companyId)
          .eq('status', 'completed')
          .order('id', { ascending: true })
          .range(from, to);
        return { data: data as { id: string }[] | null, error: error as Error | null };
      }),
    ]);

  const completedInvoiceIds = new Set(completedInvoices.map((i) => i.id));

  const fonds = products.find((p) => p.name.trim().toLowerCase() === 'fonds de rayon');
  const client414 = clients.find((c) => c.client_number === '414129');
  const retraiteUpdates = stockUpdates.filter((u) => u.sub_product_id === DEBUG_RETRAITE_SUB_ID);
  // eslint-disable-next-line no-console
  console.log('[Inventaire DEBUG] Retraite stock_updates chargés', {
    dateYmd,
    endIso,
    totalStockUpdatesFetched: stockUpdates.length,
    retraiteRowCount: retraiteUpdates.length,
    retraiteRows: retraiteUpdates.map((u) => ({
      client_id: u.client_id,
      new_stock: u.new_stock,
      created_at: u.created_at,
      invoice_id: u.invoice_id,
      invoiceCompleted: u.invoice_id ? completedInvoiceIds.has(u.invoice_id) : null,
      matchesClient414: client414 ? u.client_id === client414.id : null,
    })),
    client414Id: client414?.id ?? null,
    fondsId: fonds?.id ?? null,
  });

  if (fonds) {
    const fondsSubs = subProducts.filter((sp) => sp.product_id === fonds.id);
    // eslint-disable-next-line no-console
    console.log('[Inventaire DEBUG fetch] Fonds de Rayon', {
      dateYmd,
      endIso,
      productId: fonds.id,
      client414: client414
        ? { id: client414.id, name: client414.name, client_number: client414.client_number }
        : null,
      subProductsLoaded: fondsSubs.length,
      subs: fondsSubs.map((sp) => ({
        id: sp.id,
        name: sp.name,
        created_at: sp.created_at,
        deleted_at: sp.deleted_at ?? null,
      })),
      stockUpdatesForClient414: client414
        ? stockUpdates.filter((u) => u.client_id === client414.id).length
        : 0,
    });
  }

  return buildInventoryMatrix({
    clients,
    products,
    subProducts,
    stockUpdates,
    clientProductPrices,
    completedInvoiceIds,
    endIso,
  });
}
