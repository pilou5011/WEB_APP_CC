/**
 * Inventaire Gold — assemblage matrice Excel.
 * Stock = même logique que « Facturer (dépôt) » (lib/stock/effective-stock),
 * bornée à fin de journée pour l'historique.
 */

import {
  buildLatestNewStockMapsMultiClient,
  filterEffectiveStockUpdates,
  getDisplayedProductStockMultiClient,
  isEntityVisibleAt,
} from '@/lib/stock/effective-stock';

export type InventoryClientRow = {
  id: string;
  name: string;
  company_name: string | null;
  client_number: string | null;
  created_at: string;
  deleted_at?: string | null;
};

export type InventoryProductRow = {
  id: string;
  name: string;
  price: number | null;
  created_at: string;
  deleted_at?: string | null;
};

export type InventorySubProductRow = {
  id: string;
  product_id: string;
  name: string;
  created_at: string;
  deleted_at?: string | null;
};

export type InventoryStockUpdateRow = {
  id?: string;
  client_id: string;
  product_id: string | null;
  sub_product_id: string | null;
  new_stock: number;
  created_at: string;
  invoice_id: string | null;
};

/** Association client_products (y compris soft-deleted) pour stock + prix. */
export type InventoryClientProductPrice = {
  client_id: string;
  product_id: string;
  custom_price: number | null;
  created_at: string;
  deleted_at: string | null;
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

export function existedAtOrBefore(createdAt: string, endIso: string): boolean {
  return new Date(createdAt).getTime() <= new Date(endIso).getTime();
}

/**
 * Association client_products active à la date d'export :
 * créée au plus tard à endIso, et non soft-supprimée avant/à cette date.
 * Si deleted_at <= endIso → inactive → stock forcé à 0.
 */
export function isClientProductActiveAtInventoryDate(params: {
  created_at: string;
  deleted_at: string | null | undefined;
  endIso: string;
}): boolean {
  if (!existedAtOrBefore(params.created_at, params.endIso)) {
    return false;
  }
  if (!params.deleted_at) {
    return true;
  }
  // Suppression antérieure (ou égale) à la fin de la journée d'export → plus en stock chez le client
  return new Date(params.deleted_at).getTime() > new Date(params.endIso).getTime();
}

export function clampNonNegativeInt(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
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

/**
 * Construit la matrice inventaire.
 * @param completedInvoiceIds — factures status=completed du compte (filtre Facturer dépôt)
 */
export function buildInventoryMatrix(params: {
  clients: InventoryClientRow[];
  products: InventoryProductRow[];
  subProducts: InventorySubProductRow[];
  stockUpdates: InventoryStockUpdateRow[];
  clientProductPrices: InventoryClientProductPrice[];
  completedInvoiceIds: Set<string>;
  endIso: string;
}): InventoryMatrix {
  const endIso = params.endIso;

  // Clients / produits : existaient à la date (soft-deleted inclus pour l'historique Inventaire)
  const clients = sortInventoryClients(
    params.clients.filter((c) => existedAtOrBefore(c.created_at, endIso))
  );
  const products = sortInventoryProducts(
    params.products.filter((p) => existedAtOrBefore(p.created_at, endIso))
  );

  // Sous-produits : uniquement ceux encore « visibles » à la date
  // (même règle que Facturer : non soft-deleted à ce moment-là)
  const subsByProduct = new Map<string, string[]>();
  for (const sp of params.subProducts) {
    if (
      !isEntityVisibleAt({
        created_at: sp.created_at,
        deleted_at: sp.deleted_at,
        endIso,
      })
    ) {
      continue;
    }
    const list = subsByProduct.get(sp.product_id) ?? [];
    list.push(sp.id);
    subsByProduct.set(sp.product_id, list);
  }

  // Même filtre effectif que Facturer (dépôt), puis borne temporelle
  const effectiveUpdates = filterEffectiveStockUpdates(
    params.stockUpdates,
    params.completedInvoiceIds
  ).filter((u) => existedAtOrBefore(u.created_at, endIso));

  const { byProduct, bySubProduct } = buildLatestNewStockMapsMultiClient(effectiveUpdates);

  // Associations client_products : stock uniquement si l'association était active à la date
  const associationsByKey = new Map<string, InventoryClientProductPrice[]>();
  for (const cp of params.clientProductPrices) {
    const key = `${cp.client_id}::${cp.product_id}`;
    const list = associationsByKey.get(key) ?? [];
    list.push(cp);
    associationsByKey.set(key, list);
  }

  /** Prix « actuellement enregistré » : association non soft-deleted aujourd'hui */
  const currentPriceByKey = new Map<string, number | null>();
  for (const cp of params.clientProductPrices) {
    if (cp.deleted_at == null) {
      currentPriceByKey.set(`${cp.client_id}::${cp.product_id}`, cp.custom_price);
    }
  }

  const stocks: Record<string, Record<string, number>> = {};
  const prices: Record<string, Record<string, InventoryPriceCell>> = {};
  const values: Record<string, Record<string, InventoryPriceCell>> = {};

  for (const client of clients) {
    stocks[client.id] = {};
    prices[client.id] = {};
    values[client.id] = {};
    for (const product of products) {
      const assocKey = `${client.id}::${product.id}`;
      const associations = associationsByKey.get(assocKey) ?? [];
      const wasActiveAtDate = associations.some((a) =>
        isClientProductActiveAtInventoryDate({
          created_at: a.created_at,
          deleted_at: a.deleted_at,
          endIso,
        })
      );

      // Pas d'association active à la date (jamais lié, ou deleted_at antérieure) → stock 0
      let qty = 0;
      if (wasActiveAtDate) {
        const subIds = subsByProduct.get(product.id) ?? [];
        qty = getDisplayedProductStockMultiClient({
          clientId: client.id,
          productId: product.id,
          subProductIds: subIds,
          byProduct,
          bySubProduct,
        });
      }

      const hasCurrentAssoc = currentPriceByKey.has(assocKey);
      const price = resolveCessionPriceHt({
        catalogPrice: product.price,
        customPrice: hasCurrentAssoc ? currentPriceByKey.get(assocKey) : null,
        hasClientProductAssociation: hasCurrentAssoc,
      });
      stocks[client.id][product.id] = qty;
      prices[client.id][product.id] = price;
      values[client.id][product.id] = computeValueCell(price, qty);

      // Debug ciblé : Fonds de Rayon @ client_number 414129
      if (
        client.client_number === '414129' &&
        product.name.trim().toLowerCase() === 'fonds de rayon'
      ) {
        logFondsDeRayonQtyDebug({
          endIso,
          client,
          product,
          wasActiveAtDate,
          associations,
          allSubProducts: params.subProducts,
          includedSubIds: subsByProduct.get(product.id) ?? [],
          effectiveUpdates,
          byProduct,
          bySubProduct,
          qty,
        });
      }
    }
  }

  return { clients, products, stocks, prices, values };
}

/** Logs console (DevTools) — calcul qty Fonds de Rayon / client 414129. */
function logFondsDeRayonQtyDebug(params: {
  endIso: string;
  client: InventoryClientRow;
  product: InventoryProductRow;
  wasActiveAtDate: boolean;
  associations: InventoryClientProductPrice[];
  allSubProducts: InventorySubProductRow[];
  includedSubIds: string[];
  effectiveUpdates: InventoryStockUpdateRow[];
  byProduct: Map<string, number>;
  bySubProduct: Map<string, number>;
  qty: number;
}): void {
  const {
    endIso,
    client,
    product,
    wasActiveAtDate,
    associations,
    allSubProducts,
    includedSubIds,
    effectiveUpdates,
    byProduct,
    bySubProduct,
    qty,
  } = params;

  const catalogSubs = allSubProducts.filter((sp) => sp.product_id === product.id);
  const includedSet = new Set(includedSubIds);

  const catalogBreakdown = catalogSubs.map((sp) => {
    const createdOk = existedAtOrBefore(sp.created_at, endIso);
    const visible = isEntityVisibleAt({
      created_at: sp.created_at,
      deleted_at: sp.deleted_at,
      endIso,
    });
    let excludeReason: string | null = null;
    if (!createdOk) excludeReason = 'created_at > endIso';
    else if (!visible) {
      excludeReason =
        sp.deleted_at != null
          ? `soft-deleted (deleted_at=${sp.deleted_at} <= endIso)`
          : 'not visible (unknown)';
    }
    const latest = bySubProduct.get(`${client.id}::${sp.id}`);
    return {
      subId: sp.id,
      name: sp.name,
      created_at: sp.created_at,
      deleted_at: sp.deleted_at ?? null,
      includedInSum: includedSet.has(sp.id),
      excludeReason,
      latestNewStockForClient: latest ?? null,
      contributes: includedSet.has(sp.id) ? (latest ?? 0) : 0,
    };
  });

  const parentLatest = byProduct.get(`${client.id}::${product.id}`) ?? null;

  // Sous-mouvements client dont le sub n'est PAS dans le catalogue de ce produit
  // (ou pas inclus) — candidats « orphelins » qui pourraient expliquer 110 vs 100
  const clientSubUpdates = effectiveUpdates.filter(
    (u) => u.client_id === client.id && u.sub_product_id
  );
  const latestByOrphanSub = new Map<string, InventoryStockUpdateRow>();
  for (const u of clientSubUpdates) {
    const sid = u.sub_product_id!;
    const prev = latestByOrphanSub.get(sid);
    if (!prev || new Date(u.created_at) > new Date(prev.created_at)) {
      latestByOrphanSub.set(sid, u);
    }
  }

  const orphansNotInIncluded = Array.from(latestByOrphanSub.entries())
    .filter(([sid]) => !includedSet.has(sid))
    .map(([sid, u]) => {
      const catalog = allSubProducts.find((sp) => sp.id === sid);
      return {
        subId: sid,
        name: catalog?.name ?? '(sub inconnu / non chargé)',
        catalogProductId: catalog?.product_id ?? null,
        belongsToThisProduct: catalog?.product_id === product.id,
        created_at: catalog?.created_at ?? null,
        deleted_at: catalog?.deleted_at ?? null,
        latestNewStock: u.new_stock,
        latestAt: u.created_at,
        whyMissingFromSum:
          !catalog
            ? 'sub_product non chargé (hors company / hors fetch / RLS)'
            : catalog.product_id !== product.id
              ? `product_id catalogue = ${catalog.product_id} ≠ ${product.id}`
              : !isEntityVisibleAt({
                    created_at: catalog.created_at,
                    deleted_at: catalog.deleted_at,
                    endIso,
                  })
                ? `exclu par isEntityVisibleAt (deleted_at=${catalog.deleted_at})`
                : 'présent catalogue mais absent de includedSubIds (inattendu)',
      };
    })
    .filter((o) => o.latestNewStock !== 0 || o.belongsToThisProduct);

  const sumIncluded = catalogBreakdown.reduce((s, r) => s + r.contributes, 0);
  const missingTens = catalogBreakdown.filter(
    (r) => !r.includedInSum && r.latestNewStockForClient === 10
  );

  // eslint-disable-next-line no-console
  console.groupCollapsed(
    `[Inventaire DEBUG] Fonds de Rayon × client ${client.client_number} → qty=${qty}`
  );
  // eslint-disable-next-line no-console
  console.log('Contexte', {
    endIso,
    clientId: client.id,
    clientName: client.name,
    clientNumber: client.client_number,
    productId: product.id,
    productName: product.name,
    wasActiveAtDate,
    associations,
    parentLatestNewStock: parentLatest,
    includedSubCount: includedSubIds.length,
    catalogSubCount: catalogSubs.length,
    qtyFinal: qty,
    sumRecalculeeDesInclus: sumIncluded,
  });
  // eslint-disable-next-line no-console
  console.table(
    catalogBreakdown.map((r) => ({
      name: r.name,
      subId: r.subId.slice(0, 8) + '…',
      included: r.includedInSum,
      excludeReason: r.excludeReason ?? '',
      latestStock: r.latestNewStockForClient,
      contributes: r.contributes,
      deleted_at: r.deleted_at ?? '',
    }))
  );
  // eslint-disable-next-line no-console
  console.log(
    'Somme des contributes (sous inclus) =',
    sumIncluded,
    '| parent new_stock =',
    parentLatest,
    '| écart parent−somme =',
    parentLatest != null ? parentLatest - sumIncluded : null
  );
  if (orphansNotInIncluded.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      'Sous-mouvements client NON inclus dans la somme (candidats manquants) :',
      orphansNotInIncluded
    );
  } else {
    // eslint-disable-next-line no-console
    console.log('Aucun sous-mouvement client hors somme (hors stock 0).');
  }
  if (missingTens.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      'Variants catalogue avec stock 10 exclus du total (expliquent souvent 110→100) :',
      missingTens
    );
  }
  // eslint-disable-next-line no-console
  console.groupEnd();
}

export function sumNumericCells(cells: InventoryPriceCell[]): number {
  let sum = 0;
  for (const c of cells) {
    if (typeof c === 'number' && Number.isFinite(c)) sum += c;
  }
  return Math.round(sum * 100) / 100;
}

// Réexport pour les self-tests / compat
export {
  filterEffectiveStockUpdates,
  buildLatestNewStockMapsMultiClient as buildLatestNewStockMaps,
  getDisplayedProductStockMultiClient as getHistoricalProductStock,
} from '@/lib/stock/effective-stock';
