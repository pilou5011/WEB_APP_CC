/**
 * Inventaire Gold — types et helpers de calcul pur (testables sans Supabase).
 *
 * Stock historique : dernier stock_updates.new_stock avec created_at <= fin de journée.
 * Produit avec sous-produits : somme des new_stock des sous-produits.
 * Quantités exportées : entiers >= 0.
 */

export type InventoryClientRow = {
  id: string;
  name: string;
  company_name: string | null;
  client_number: string | null;
  created_at: string;
};

export type InventoryProductRow = {
  id: string;
  name: string;
  price: number | null;
  created_at: string;
};

export type InventorySubProductRow = {
  id: string;
  product_id: string;
  name: string;
  created_at: string;
};

export type InventoryStockUpdateRow = {
  client_id: string;
  product_id: string | null;
  sub_product_id: string | null;
  new_stock: number;
  created_at: string;
};

/** Prix custom actuel par couple client/produit (associations actuelles). */
export type InventoryClientProductPrice = {
  client_id: string;
  product_id: string;
  custom_price: number | null;
};

export type InventoryPriceCell = number | 'N/A';

export type InventoryMatrix = {
  clients: InventoryClientRow[];
  products: InventoryProductRow[];
  /** stock[clientId][productId] */
  stocks: Record<string, Record<string, number>>;
  /** price[clientId][productId] */
  prices: Record<string, Record<string, InventoryPriceCell>>;
  /** value[clientId][productId] — number or N/A */
  values: Record<string, Record<string, InventoryPriceCell>>;
};

/**
 * Borne haute UTC inclusive pour une date civile YYYY-MM-DD :
 * fin de cette journée en heure locale du navigateur/runtime (23:59:59.999).
 */
export function getInventoryEndOfDayIso(dateYmd: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateYmd);
  if (!match) {
    throw new Error(`Date d'inventaire invalide: ${dateYmd}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const endLocal = new Date(year, month - 1, day, 23, 59, 59, 999);
  return endLocal.toISOString();
}

/** Entité existait déjà à la date d'inventaire (created_at <= borne). */
export function existedAtOrBefore(createdAt: string, endIso: string): boolean {
  return new Date(createdAt).getTime() <= new Date(endIso).getTime();
}

export function clampNonNegativeInt(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

/**
 * Construit, pour chaque (client, product|sub_product), le dernier new_stock
 * connu à la date (mouvements déjà filtrés created_at <= endIso).
 * En cas de plusieurs lignes, on garde le created_at le plus récent (puis id non dispo → ordre stable).
 */
export function buildLatestNewStockMaps(
  updates: InventoryStockUpdateRow[]
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
      const prev = subSeenAt.get(key);
      if (prev === undefined || t >= prev) {
        subSeenAt.set(key, t);
        bySubProduct.set(key, clampNonNegativeInt(u.new_stock));
      }
      continue;
    }
    if (u.product_id) {
      const key = `${u.client_id}::${u.product_id}`;
      const prev = productSeenAt.get(key);
      if (prev === undefined || t >= prev) {
        productSeenAt.set(key, t);
        byProduct.set(key, clampNonNegativeInt(u.new_stock));
      }
    }
  }

  return { byProduct, bySubProduct };
}

export function getHistoricalProductStock(params: {
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
    return clampNonNegativeInt(sum);
  }

  return byProduct.get(`${clientId}::${productId}`) ?? 0;
}

/**
 * Prix de cession HT actuel :
 * - si association client_products : custom_price ?? products.price
 * - si produit jamais présent chez le client : products.price (prix catalogue)
 * - si aucun prix numérique : N/A
 */
export function resolveCessionPriceHt(params: {
  catalogPrice: number | null | undefined;
  customPrice: number | null | undefined;
  hasClientProductAssociation: boolean;
}): InventoryPriceCell {
  const { catalogPrice, customPrice, hasClientProductAssociation } = params;

  if (hasClientProductAssociation) {
    const raw = customPrice ?? catalogPrice;
    if (raw === null || raw === undefined || !Number.isFinite(Number(raw))) {
      return 'N/A';
    }
    return Number(raw);
  }

  if (catalogPrice === null || catalogPrice === undefined || !Number.isFinite(Number(catalogPrice))) {
    return 'N/A';
  }
  return Number(catalogPrice);
}

export function computeValueCell(
  price: InventoryPriceCell,
  qty: number
): InventoryPriceCell {
  if (price === 'N/A') return 'N/A';
  const q = clampNonNegativeInt(qty);
  const value = price * q;
  if (!Number.isFinite(value) || value < 0) return 0;
  // Arrondi monétaire 2 décimales
  return Math.round(value * 100) / 100;
}

export function sortInventoryClients(clients: InventoryClientRow[]): InventoryClientRow[] {
  return [...clients].sort((a, b) => {
    const n = (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base' });
    if (n !== 0) return n;
    const c = (a.company_name || '').localeCompare(b.company_name || '', 'fr', {
      sensitivity: 'base',
    });
    if (c !== 0) return c;
    return (a.client_number || '').localeCompare(b.client_number || '', 'fr', {
      sensitivity: 'base',
    });
  });
}

export function sortInventoryProducts(products: InventoryProductRow[]): InventoryProductRow[] {
  return [...products].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base' })
  );
}

export function buildInventoryMatrix(params: {
  clients: InventoryClientRow[];
  products: InventoryProductRow[];
  subProducts: InventorySubProductRow[];
  stockUpdates: InventoryStockUpdateRow[];
  clientProductPrices: InventoryClientProductPrice[];
  endIso: string;
}): InventoryMatrix {
  const endIso = params.endIso;

  const clients = sortInventoryClients(
    params.clients.filter((c) => existedAtOrBefore(c.created_at, endIso))
  );
  const products = sortInventoryProducts(
    params.products.filter((p) => existedAtOrBefore(p.created_at, endIso))
  );

  const subsByProduct = new Map<string, string[]>();
  for (const sp of params.subProducts) {
    if (!existedAtOrBefore(sp.created_at, endIso)) continue;
    const list = subsByProduct.get(sp.product_id) ?? [];
    list.push(sp.id);
    subsByProduct.set(sp.product_id, list);
  }

  const updates = params.stockUpdates.filter((u) =>
    existedAtOrBefore(u.created_at, endIso)
  );
  const { byProduct, bySubProduct } = buildLatestNewStockMaps(updates);

  const priceAssoc = new Map<string, number | null>();
  for (const cp of params.clientProductPrices) {
    priceAssoc.set(`${cp.client_id}::${cp.product_id}`, cp.custom_price);
  }

  const stocks: Record<string, Record<string, number>> = {};
  const prices: Record<string, Record<string, InventoryPriceCell>> = {};
  const values: Record<string, Record<string, InventoryPriceCell>> = {};

  for (const client of clients) {
    stocks[client.id] = {};
    prices[client.id] = {};
    values[client.id] = {};
    for (const product of products) {
      const subIds = subsByProduct.get(product.id) ?? [];
      const qty = getHistoricalProductStock({
        clientId: client.id,
        productId: product.id,
        subProductIds: subIds,
        byProduct,
        bySubProduct,
      });
      const assocKey = `${client.id}::${product.id}`;
      const hasAssoc = priceAssoc.has(assocKey);
      const price = resolveCessionPriceHt({
        catalogPrice: product.price,
        customPrice: hasAssoc ? priceAssoc.get(assocKey) : null,
        hasClientProductAssociation: hasAssoc,
      });
      stocks[client.id][product.id] = qty;
      prices[client.id][product.id] = price;
      values[client.id][product.id] = computeValueCell(price, qty);
    }
  }

  return { clients, products, stocks, prices, values };
}

export function sumNumericCells(cells: InventoryPriceCell[]): number {
  let sum = 0;
  for (const c of cells) {
    if (typeof c === 'number' && Number.isFinite(c)) sum += c;
  }
  return Math.round(sum * 100) / 100;
}
