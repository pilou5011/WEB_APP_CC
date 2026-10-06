import type { Product, StockUpdate } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { isEffectiveStockUpdate } from '@/lib/stock/effective-stock';
import {
  resolveDeliveryNoteLines,
  type ResolvedDeliveryNoteLine,
} from './service';
import {
  deliveryNotesTable,
  ensureDeliveryNotesSoftDeleteColumn,
  nowIso,
  withActiveSqlFilter,
} from './db-helpers';
import {
  convertResolvedLinesToCashInvoiceLines,
  type CashInvoiceImportLine,
} from './cash-invoice-convert';
import {
  findCessionPriceConflicts,
  resolveEffectiveDeliveryNotePrices,
  type PriceConflict,
} from './pricing';
import { fetchClientProductPriceOverrides } from './validation-service';

export type { CashInvoiceImportLine };
export { convertResolvedLinesToCashInvoiceLines };
export type { PriceConflict };

export type DeliveryNoteImportSubLinePreview = {
  subProductId: string;
  subProductName: string;
  quantity: number;
  previousDepot: number | null;
  newDepot: number;
  isNew: boolean;
};

export type DeliveryNoteImportLinePreview = {
  productId: string;
  productName: string;
  quantity: number;
  /** null = produit absent du tableau (afficher « - ») */
  previousDepot: number | null;
  newDepot: number;
  isNewProduct: boolean;
  subLines: DeliveryNoteImportSubLinePreview[];
};

export type DeliveryNoteImportPreview = {
  lines: DeliveryNoteImportLinePreview[];
  added: DeliveryNoteImportLinePreview[];
  updated: DeliveryNoteImportLinePreview[];
  /** Conflits de prix de cession HT avec Facturer (dépôt) — import bloqué si non vide */
  priceConflicts: PriceConflict[];
};

export type CashInvoiceImportPreview = {
  deliveryNoteId: string;
  deliveryNumber: string;
  lines: CashInvoiceImportLine[];
};

async function getLastAncienDepotByIds(params: {
  clientId: string;
  companyId: string;
  productIds: string[];
  subProductIds: string[];
}): Promise<{ byProduct: Map<string, number>; bySubProduct: Map<string, number> }> {
  const byProduct = new Map<string, number>();
  const bySubProduct = new Map<string, number>();
  const { clientId, companyId, productIds, subProductIds } = params;

  const { data: completedInvoices } = await supabase
    .from('invoices')
    .select('id')
    .eq('client_id', clientId)
    .eq('company_id', companyId)
    .eq('status', 'completed');

  const completedIds = new Set((completedInvoices || []).map((i) => i.id));
  const isEffective = (invoiceId: string | null) => isEffectiveStockUpdate(invoiceId, completedIds);

  if (productIds.length > 0) {
    const { data: updates, error } = await supabase
      .from('stock_updates')
      .select('product_id, sub_product_id, new_stock, created_at, invoice_id')
      .eq('client_id', clientId)
      .eq('company_id', companyId)
      .in('product_id', productIds)
      .is('sub_product_id', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const effective = (updates || []).filter((u) => isEffective(u.invoice_id)) as StockUpdate[];
    for (const productId of productIds) {
      const latest = effective.find((u) => u.product_id === productId);
      byProduct.set(productId, latest?.new_stock ?? 0);
    }
  }

  if (subProductIds.length > 0) {
    const { data: updates, error } = await supabase
      .from('stock_updates')
      .select('sub_product_id, new_stock, created_at, invoice_id')
      .eq('client_id', clientId)
      .eq('company_id', companyId)
      .in('sub_product_id', subProductIds)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const effective = (updates || []).filter((u) => isEffective(u.invoice_id)) as StockUpdate[];
    for (const subProductId of subProductIds) {
      const latest = effective.find((u) => u.sub_product_id === subProductId);
      bySubProduct.set(subProductId, latest?.new_stock ?? 0);
    }
  }

  return { byProduct, bySubProduct };
}

/** Dernier ancien dépôt effectif par produit (dernier stock_update.new_stock). */
export async function getLastAncienDepotByProduct(
  clientId: string,
  companyId: string,
  productIds: string[]
): Promise<Map<string, number>> {
  const { byProduct } = await getLastAncienDepotByIds({
    clientId,
    companyId,
    productIds,
    subProductIds: [],
  });
  return byProduct;
}

/** Vérifie qu'un BL est encore importable (validated, non deleted). */
export async function assertDeliveryNoteImportable(
  companyId: string,
  deliveryNoteId: string
): Promise<{ id: string; delivery_number: string; client_id: string }> {
  await ensureDeliveryNotesSoftDeleteColumn();

  const { data: note, error } = await deliveryNotesTable('delivery_notes')
    .select('id, delivery_number, client_id, status, deleted_at')
    .eq('id', deliveryNoteId)
    .eq('company_id', companyId)
    .maybeSingle();

  if (error) throw error;
  if (!note || note.deleted_at) {
    throw new Error('Bon de livraison introuvable');
  }
  if (note.status === 'imported') {
    throw new Error(
      "Ce bon de livraison n'est plus disponible car il a déjà été utilisé."
    );
  }
  if (note.status !== 'validated') {
    throw new Error('Seuls les bons de livraison validés peuvent être importés');
  }

  return {
    id: note.id,
    delivery_number: note.delivery_number,
    client_id: note.client_id,
  };
}

/**
 * Prépare l'import d'un BL dans Facturer (compte ferme) :
 * vérifie le statut + convertit parent/sous-produits → lignes agrégées.
 * Ne marque PAS le BL comme imported.
 */
export async function buildCashInvoiceImportPreview(
  companyId: string,
  deliveryNoteId: string
): Promise<CashInvoiceImportPreview> {
  const note = await assertDeliveryNoteImportable(companyId, deliveryNoteId);

  // mergeCurrentSubProducts: false → quantités historiques du BL (somme des sous stockés)
  const resolved = await resolveDeliveryNoteLines(deliveryNoteId, companyId, {
    mergeCurrentSubProducts: false,
  });
  const lines = convertResolvedLinesToCashInvoiceLines(resolved);

  if (lines.length === 0) {
    throw new Error('Ce bon de livraison ne contient aucun produit importable');
  }

  return {
    deliveryNoteId: note.id,
    deliveryNumber: note.delivery_number,
    lines,
  };
}

/**
 * Passe un BL validated → imported de façon conditionnelle (anti double-emploi).
 * @returns true si le BL a bien été marqué, false s'il n'était plus disponible.
 */
export async function markDeliveryNoteAsImported(
  companyId: string,
  deliveryNoteId: string
): Promise<boolean> {
  await ensureDeliveryNotesSoftDeleteColumn();
  const importedAt = nowIso();
  const { data, error } = await withActiveSqlFilter(
    deliveryNotesTable('delivery_notes')
      .update({
        status: 'imported',
        imported_at: importedAt,
        updated_at: importedAt,
      })
      .eq('id', deliveryNoteId)
      .eq('company_id', companyId)
      .eq('status', 'validated')
  )
    .select('id')
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.id);
}

/**
 * Remet un BL imported → validated (rollback si la génération facture échoue après claim).
 */
export async function revertDeliveryNoteToValidated(
  companyId: string,
  deliveryNoteId: string
): Promise<void> {
  await ensureDeliveryNotesSoftDeleteColumn();
  const updatedAt = nowIso();
  const { error } = await withActiveSqlFilter(
    deliveryNotesTable('delivery_notes')
      .update({
        status: 'validated',
        imported_at: null,
        updated_at: updatedAt,
      })
      .eq('id', deliveryNoteId)
      .eq('company_id', companyId)
      .eq('status', 'imported')
  );
  if (error) throw error;
}

export async function buildDeliveryNoteImportPreview(
  clientId: string,
  companyId: string,
  deliveryNoteId: string
): Promise<DeliveryNoteImportPreview> {
  await assertDeliveryNoteImportable(companyId, deliveryNoteId);

  const resolved = await resolveDeliveryNoteLines(deliveryNoteId, companyId, {
    mergeCurrentSubProducts: true,
  });

  const preview = await buildDeliveryNoteImportPreviewFromResolved(
    clientId,
    companyId,
    resolved
  );

  const overrides = await fetchClientProductPriceOverrides(
    clientId,
    companyId,
    resolved.map((l) => l.product_id)
  );

  const conflictInputs = resolved.map((line) => {
    const override = overrides.get(line.product_id) ?? null;
    const effective = resolveEffectiveDeliveryNotePrices({
      line: {
        unit_price_ht: line.unit_price_ht,
        recommended_sale_price_ttc: line.recommended_sale_price_ttc,
        unit_price_ht_is_custom: line.unit_price_ht_is_custom,
        recommended_sale_price_ttc_is_custom: line.recommended_sale_price_ttc_is_custom,
      },
      product: {
        price: line.product_price ?? 0,
        recommended_sale_price: line.product_recommended_sale_price,
      },
      clientOverride: override,
      isDraft: false,
    });

    return {
      productId: line.product_id,
      productName: line.product_name,
      blCessionHt: effective.cessionHt,
      depositCessionHt: override
        ? (override.custom_price ?? line.product_price ?? 0)
        : null,
    };
  });

  return {
    ...preview,
    priceConflicts: findCessionPriceConflicts(conflictInputs),
  };
}

export async function buildDeliveryNoteImportPreviewFromResolved(
  clientId: string,
  companyId: string,
  lines: Array<
    Pick<ResolvedDeliveryNoteLine, 'product_id' | 'product_name' | 'quantity' | 'subLines'> & {
      product?: Product | null;
    }
  >
): Promise<Omit<DeliveryNoteImportPreview, 'priceConflicts'>> {
  const productIds = lines.map((l) => l.product_id);
  const subProductIds = lines.flatMap((l) => l.subLines.map((s) => s.sub_product_id));

  const [{ byProduct, bySubProduct }, existingClientProducts, existingClientSubProducts] =
    await Promise.all([
      getLastAncienDepotByIds({ clientId, companyId, productIds, subProductIds }),
      supabase
        .from('client_products')
        .select('product_id')
        .eq('client_id', clientId)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .in('product_id', productIds.length > 0 ? productIds : ['00000000-0000-0000-0000-000000000000']),
      subProductIds.length > 0
        ? supabase
            .from('client_sub_products')
            .select('sub_product_id')
            .eq('client_id', clientId)
            .eq('company_id', companyId)
            .is('deleted_at', null)
            .in('sub_product_id', subProductIds)
        : Promise.resolve({ data: [] as Array<{ sub_product_id: string }> }),
    ]);

  const existingProductSet = new Set(
    (existingClientProducts.data || []).map((cp) => cp.product_id)
  );
  const existingSubSet = new Set(
    (existingClientSubProducts.data || []).map((csp) => csp.sub_product_id)
  );

  const previews: DeliveryNoteImportLinePreview[] = lines.map((line) => {
    const isNew = !existingProductSet.has(line.product_id);

    if (line.subLines.length === 0) {
      const previousDepot = isNew ? null : (byProduct.get(line.product_id) ?? 0);
      const quantity = line.quantity;
      return {
        productId: line.product_id,
        productName: line.product_name,
        quantity,
        previousDepot,
        newDepot: (previousDepot ?? 0) + quantity,
        isNewProduct: isNew,
        subLines: [],
      };
    }

    const subLines: DeliveryNoteImportSubLinePreview[] = line.subLines.map((sub) => {
      const isNewSub = !existingSubSet.has(sub.sub_product_id);
      const previousDepot = isNewSub ? null : (bySubProduct.get(sub.sub_product_id) ?? 0);
      return {
        subProductId: sub.sub_product_id,
        subProductName: sub.sub_product_name,
        quantity: sub.quantity,
        previousDepot,
        newDepot: (previousDepot ?? 0) + sub.quantity,
        isNew: isNewSub,
      };
    });

    const previousDepot = isNew
      ? null
      : subLines.reduce((sum, sub) => sum + (sub.previousDepot ?? 0), 0);
    const quantity = subLines.reduce((sum, sub) => sum + sub.quantity, 0);
    const newDepot = subLines.reduce((sum, sub) => sum + sub.newDepot, 0);

    return {
      productId: line.product_id,
      productName: line.product_name,
      quantity,
      previousDepot,
      newDepot,
      isNewProduct: isNew,
      subLines,
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
  const {
    data: { session },
  } = await supabase.auth.getSession();
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
    throw new Error(data?.error || "Erreur lors de l'import");
  }
}
