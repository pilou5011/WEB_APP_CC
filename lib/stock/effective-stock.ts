/**
 * Source de vérité stock « Facturer (dépôt) » :
 * dernier stock_updates.new_stock parmi les mouvements *effectifs*.
 *
 * Effectif =
 *   - invoice_id IS NULL (ajustement, association, import BL, …)
 *   - OU facture liée avec status = 'completed'
 *
 * Produit avec sous-produits : somme des new_stock des sous-produits (pas la ligne produit).
 * Aucun mouvement → 0. Pas de fallback sur client_products.current_stock.
 */

export type StockUpdateLike = {
  product_id?: string | null;
  sub_product_id?: string | null;
  new_stock: number;
  created_at: string;
  invoice_id?: string | null;
};

export function isEffectiveStockUpdate(
  invoiceId: string | null | undefined,
  completedInvoiceIds: Set<string>
): boolean {
  return !invoiceId || completedInvoiceIds.has(invoiceId);
}

export function filterEffectiveStockUpdates<T extends { invoice_id?: string | null }>(
  updates: T[],
  completedInvoiceIds: Set<string>
): T[] {
  return updates.filter((u) => isEffectiveStockUpdate(u.invoice_id ?? null, completedInvoiceIds));
}

/**
 * Construit les maps « dernier update » pour UN client
 * (clés = product_id / sub_product_id), comme Facturer (dépôt).
 */
export function buildLatestStockUpdateMapsForClient<T extends StockUpdateLike>(
  updates: T[]
): {
  byProductId: Record<string, T>;
  bySubProductId: Record<string, T>;
} {
  const byProductId: Record<string, T> = {};
  const bySubProductId: Record<string, T> = {};

  for (const update of updates) {
    if (update.product_id && !update.sub_product_id) {
      const key = update.product_id;
      const prev = byProductId[key];
      if (!prev || new Date(update.created_at) > new Date(prev.created_at)) {
        byProductId[key] = update;
      }
    } else if (update.sub_product_id) {
      const key = update.sub_product_id;
      const prev = bySubProductId[key];
      if (!prev || new Date(update.created_at) > new Date(prev.created_at)) {
        bySubProductId[key] = update;
      }
    }
  }

  return { byProductId, bySubProductId };
}

/**
 * Maps multi-clients : clés `${clientId}::${productId|subProductId}`.
 * Même règle de « plus récent » que Facturer (dépôt) : created_at strictement supérieur.
 */
export function buildLatestNewStockMapsMultiClient(
  updates: Array<StockUpdateLike & { client_id: string }>
): {
  byProduct: Map<string, number>;
  bySubProduct: Map<string, number>;
} {
  const byProduct = new Map<string, number>();
  const bySubProduct = new Map<string, number>();
  const productSeenAt = new Map<string, number>();
  const subSeenAt = new Map<string, number>();

  for (const u of updates) {
    const t = new Date(u.created_at).getTime();
    if (u.sub_product_id) {
      const key = `${u.client_id}::${u.sub_product_id}`;
      const prevT = subSeenAt.get(key);
      if (prevT === undefined || t > prevT) {
        subSeenAt.set(key, t);
        bySubProduct.set(key, u.new_stock);
      }
      continue;
    }
    if (u.product_id) {
      const key = `${u.client_id}::${u.product_id}`;
      const prevT = productSeenAt.get(key);
      if (prevT === undefined || t > prevT) {
        productSeenAt.set(key, t);
        byProduct.set(key, u.new_stock);
      }
    }
  }

  return { byProduct, bySubProduct };
}

/** Stock affiché Facturer (dépôt) pour un produit (avec ou sans sous-produits). */
export function getDisplayedProductStock(params: {
  productId: string;
  subProductIds: string[];
  byProductId: Record<string, { new_stock: number } | undefined>;
  bySubProductId: Record<string, { new_stock: number } | undefined>;
}): number {
  const { productId, subProductIds, byProductId, bySubProductId } = params;
  if (subProductIds.length > 0) {
    let sum = 0;
    for (const spId of subProductIds) {
      const last = bySubProductId[spId];
      sum += last ? last.new_stock : 0;
    }
    return sum;
  }
  const last = byProductId[productId];
  return last ? last.new_stock : 0;
}

export function getDisplayedProductStockMultiClient(params: {
  clientId: string;
  productId: string;
  subProductIds: string[];
  byProduct: Map<string, number>;
  bySubProduct: Map<string, number>;
}): number {
  const { clientId, productId, subProductIds, byProduct, bySubProduct } = params;
  if (subProductIds.length > 0) {
    let sum = 0;
    for (const spId of subProductIds) {
      sum += bySubProduct.get(`${clientId}::${spId}`) ?? 0;
    }
    return sum;
  }
  return byProduct.get(`${clientId}::${productId}`) ?? 0;
}

/** Sous-produit visible à la date D (comme Facturer l’aurait affiché). */
export function isEntityVisibleAt(params: {
  created_at: string;
  deleted_at: string | null | undefined;
  endIso: string;
}): boolean {
  const created = new Date(params.created_at).getTime();
  const end = new Date(params.endIso).getTime();
  if (created > end) return false;
  if (!params.deleted_at) return true;
  // Soft-deleted après la borne → encore visible à la date d'inventaire
  return new Date(params.deleted_at).getTime() > end;
}
