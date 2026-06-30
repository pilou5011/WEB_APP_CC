import type { Product, StockUpdate } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';

export type DeliveryNoteImportLinePreview = {
  productId: string;
  productName: string;
  quantity: number;
  /** null = produit absent du tableau (afficher « - ») */
  previousDepot: number | null;
  newDepot: number;
  isNewProduct: boolean;
};

export type DeliveryNoteImportPreview = {
  lines: DeliveryNoteImportLinePreview[];
  added: DeliveryNoteImportLinePreview[];
  updated: DeliveryNoteImportLinePreview[];
};

/** Dernier ancien dépôt effectif par produit (dernier stock_update.new_stock). */
export async function getLastAncienDepotByProduct(
  clientId: string,
  companyId: string,
  productIds: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (productIds.length === 0) return result;

  const { data: updates, error } = await supabase
    .from('stock_updates')
    .select('product_id, sub_product_id, new_stock, created_at, invoice_id')
    .eq('client_id', clientId)
    .eq('company_id', companyId)
    .in('product_id', productIds)
    .is('sub_product_id', null)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const { data: completedInvoices } = await supabase
    .from('invoices')
    .select('id')
    .eq('client_id', clientId)
    .eq('company_id', companyId)
    .eq('status', 'completed');

  const completedIds = new Set((completedInvoices || []).map((i) => i.id));

  const effective = (updates || []).filter(
    (u) => !u.invoice_id || completedIds.has(u.invoice_id)
  ) as StockUpdate[];

  for (const productId of productIds) {
    const latest = effective.find((u) => u.product_id === productId);
    result.set(productId, latest?.new_stock ?? 0);
  }

  return result;
}

export async function buildDeliveryNoteImportPreview(
  clientId: string,
  companyId: string,
  lines: Array<{ product_id: string; quantity: number; product?: Product | null }>
): Promise<DeliveryNoteImportPreview> {
  const productIds = lines.map((l) => l.product_id);
  const ancienDepotMap = await getLastAncienDepotByProduct(clientId, companyId, productIds);

  const { data: existingClientProducts } = await supabase
    .from('client_products')
    .select('product_id')
    .eq('client_id', clientId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .in('product_id', productIds);

  const existingSet = new Set((existingClientProducts || []).map((cp) => cp.product_id));

  const previews: DeliveryNoteImportLinePreview[] = lines.map((line) => {
    const isNew = !existingSet.has(line.product_id);
    const previousDepot = isNew ? null : (ancienDepotMap.get(line.product_id) ?? 0);
    const quantity = line.quantity;
    const newDepot = (previousDepot ?? 0) + quantity;
    return {
      productId: line.product_id,
      productName: line.product?.name || 'Produit',
      quantity,
      previousDepot,
      newDepot,
      isNewProduct: isNew,
    };
  });

  return {
    lines: previews,
    added: previews.filter((p) => p.isNewProduct),
    updated: previews.filter((p) => !p.isNewProduct),
  };
}

export async function executeDeliveryNoteImport(params: {
  deliveryNoteId: string;
}): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Session expirée');
  }

  const response = await fetch('/api/delivery-notes/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ deliveryNoteId: params.deliveryNoteId }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Erreur lors de l\'import');
  }
}
