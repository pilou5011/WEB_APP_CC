/**
 * Self-test inventaire + alignement Facturer (dépôt).
 * Exécuter : npx tsx lib/inventaire/calc.selftest.ts
 */
import assert from 'node:assert/strict';
import {
  buildInventoryMatrix,
  clampNonNegativeInt,
  computeValueCell,
  getInventoryEndOfDayIso,
  formatMissingPurchasePriceAlert,
  listProductsMissingPurchasePrice,
  resolvePurchasePriceHt,
  sumNumericCells,
} from './types';
import { buildInventoryWorkbook } from './excel';
import {
  buildLatestStockUpdateMapsForClient,
  filterEffectiveStockUpdates,
  getDisplayedProductStock,
  isEffectiveStockUpdate,
} from '@/lib/stock/effective-stock';

function testEndOfDay() {
  const iso = getInventoryEndOfDayIso('2026-09-15');
  const d = new Date(iso);
  const local = new Date(2026, 8, 15, 23, 59, 59, 999);
  assert.equal(d.getTime(), local.getTime());
}

function testEffectiveInvoiceFilter() {
  const completed = new Set(['inv-ok']);
  assert.equal(isEffectiveStockUpdate(null, completed), true);
  assert.equal(isEffectiveStockUpdate('inv-ok', completed), true);
  assert.equal(isEffectiveStockUpdate('inv-processing', completed), false);

  const filtered = filterEffectiveStockUpdates(
    [
      { id: 1, invoice_id: null, new_stock: 10 },
      { id: 2, invoice_id: 'inv-ok', new_stock: 20 },
      { id: 3, invoice_id: 'inv-draft', new_stock: 999 },
    ],
    completed
  );
  assert.equal(filtered.length, 2);
  assert.ok(!filtered.some((u) => u.new_stock === 999));
}

function testFacturerMapsMatchInventoryToday() {
  const completed = new Set(['inv-1']);
  const updates = [
    {
      client_id: 'c1',
      product_id: 'p1',
      sub_product_id: null,
      new_stock: 37,
      created_at: '2026-09-20T10:00:00.000Z',
      invoice_id: 'inv-1',
    },
    {
      client_id: 'c1',
      product_id: 'p1',
      sub_product_id: null,
      new_stock: 999,
      created_at: '2026-09-21T10:00:00.000Z',
      invoice_id: 'inv-draft', // non completed → ignoré comme Facturer
    },
    {
      client_id: 'c1',
      product_id: 'p2',
      sub_product_id: null,
      new_stock: 12,
      created_at: '2026-09-19T10:00:00.000Z',
      invoice_id: null,
    },
  ];

  const effective = filterEffectiveStockUpdates(updates, completed);
  const { byProductId, bySubProductId } = buildLatestStockUpdateMapsForClient(effective);

  assert.equal(getDisplayedProductStock({
    productId: 'p1',
    subProductIds: [],
    byProductId,
    bySubProductId,
  }), 37);
  assert.equal(getDisplayedProductStock({
    productId: 'p2',
    subProductIds: [],
    byProductId,
    bySubProductId,
  }), 12);

  const endIso = '2026-12-31T22:59:59.999Z';
  const matrix = buildInventoryMatrix({
    endIso,
    completedInvoiceIds: completed,
    clients: [
      {
        id: 'c1',
        name: 'Client A',
        company_name: 'A SA',
        client_number: '1',
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ],
    products: [
      { id: 'p1', name: 'X', price: 10, purchase_price_ht: 4, created_at: '2026-01-01T00:00:00.000Z' },
      { id: 'p2', name: 'Y', price: 5, purchase_price_ht: 2, created_at: '2026-01-01T00:00:00.000Z' },
    ],
    subProducts: [],
    stockUpdates: updates,
    clientProductPrices: [
      {
        client_id: 'c1',
        product_id: 'p1',
        custom_price: null,
        created_at: '2026-01-01T00:00:00.000Z',
        deleted_at: null,
      },
      {
        client_id: 'c1',
        product_id: 'p2',
        custom_price: null,
        created_at: '2026-01-01T00:00:00.000Z',
        deleted_at: null,
      },
    ],
  });

  assert.equal(matrix.stocks.c1.p1, 37);
  assert.equal(matrix.stocks.c1.p2, 12);
}

function testSubProductSumSameAsFacturer() {
  const updates = [
    {
      product_id: null,
      sub_product_id: 'a',
      new_stock: 40,
      created_at: '2026-09-01T00:00:00.000Z',
      invoice_id: null,
    },
    {
      product_id: null,
      sub_product_id: 'b',
      new_stock: 35,
      created_at: '2026-09-01T00:00:00.000Z',
      invoice_id: null,
    },
    {
      product_id: null,
      sub_product_id: 'c',
      new_stock: 25,
      created_at: '2026-09-01T00:00:00.000Z',
      invoice_id: null,
    },
  ];
  const { byProductId, bySubProductId } = buildLatestStockUpdateMapsForClient(updates);
  assert.equal(
    getDisplayedProductStock({
      productId: 'parent',
      subProductIds: ['a', 'b', 'c'],
      byProductId,
      bySubProductId,
    }),
    100
  );
}

function testHistoricalExcludesLaterMoves() {
  const endIso = '2026-09-15T21:59:59.999Z';
  const matrix = buildInventoryMatrix({
    endIso,
    completedInvoiceIds: new Set(),
    clients: [
      {
        id: 'c1',
        name: 'Alpha',
        company_name: 'Alpha SA',
        client_number: '001',
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ],
    products: [
      {
        id: 'p1',
        name: 'Produit A',
        price: 8,
        purchase_price_ht: 10,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ],
    subProducts: [],
    stockUpdates: [
      {
        client_id: 'c1',
        product_id: 'p1',
        sub_product_id: null,
        new_stock: 7,
        created_at: '2026-09-15T20:00:00.000Z',
        invoice_id: null,
      },
      {
        client_id: 'c1',
        product_id: 'p1',
        sub_product_id: null,
        new_stock: 99,
        created_at: '2026-09-16T10:00:00.000Z',
        invoice_id: null,
      },
    ],
    clientProductPrices: [
      {
        client_id: 'c1',
        product_id: 'p1',
        custom_price: null,
        created_at: '2026-01-01T00:00:00.000Z',
        deleted_at: null,
      },
    ],
  });

  assert.equal(matrix.stocks.c1.p1, 7);
  assert.equal(matrix.prices.c1.p1, 10);
  assert.equal(matrix.values.c1.p1, 70);
}

function testClientProductDeletedBeforeExportForcesZero() {
  const endIso = '2026-09-15T21:59:59.999Z';
  const matrix = buildInventoryMatrix({
    endIso,
    completedInvoiceIds: new Set(),
    clients: [
      {
        id: 'c1',
        name: 'Alpha',
        company_name: null,
        client_number: null,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ],
    products: [
      {
        id: 'p1',
        name: 'Produit A',
        price: 10,
        purchase_price_ht: 4,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ],
    subProducts: [],
    stockUpdates: [
      {
        client_id: 'c1',
        product_id: 'p1',
        sub_product_id: null,
        new_stock: 50,
        created_at: '2026-09-10T10:00:00.000Z',
        invoice_id: null,
      },
    ],
    clientProductPrices: [
      {
        client_id: 'c1',
        product_id: 'p1',
        custom_price: 8,
        created_at: '2026-01-01T00:00:00.000Z',
        deleted_at: '2026-09-01T00:00:00.000Z', // soft-delete avant la date d'export
      },
    ],
  });

  assert.equal(matrix.stocks.c1.p1, 0);
  // Prix d'achat du produit, pas le prix de cession (10) ni le prix client (8)
  assert.equal(matrix.prices.c1.p1, 4);
  assert.equal(matrix.values.c1.p1, 0);
}

function testPricesAndClamp() {
  assert.equal(clampNonNegativeInt(-3), 0);
  assert.equal(resolvePurchasePriceHt(5), 5);
  assert.equal(resolvePurchasePriceHt(0), 0);
  assert.equal(resolvePurchasePriceHt('4.50'), 4.5);
  assert.equal(resolvePurchasePriceHt(null), 'N/A');
  assert.equal(resolvePurchasePriceHt(undefined), 'N/A');
  assert.equal(resolvePurchasePriceHt(''), 'N/A');
  assert.equal(computeValueCell('N/A', 10), 'N/A');
  assert.equal(computeValueCell(4, 10), 40);
  assert.equal(sumNumericCells([1, 'N/A', 2.5]), 3.5);
}

function valuationFixture() {
  const endIso = '2026-12-31T22:59:59.999Z';
  return buildInventoryMatrix({
    endIso,
    completedInvoiceIds: new Set(),
    clients: [
      {
        id: 'alpha',
        name: 'Alpha',
        company_name: null,
        client_number: '1',
        created_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'beta',
        name: 'Beta',
        company_name: null,
        client_number: '2',
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ],
    products: [
      {
        id: 'affiche',
        name: 'Affiche',
        price: 9,
        purchase_price_ht: 4,
        created_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'carte',
        name: 'Carte',
        price: 8,
        purchase_price_ht: 5,
        created_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'parent',
        name: 'Coffret',
        price: 6.5,
        purchase_price_ht: 4,
        created_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'sans-achat',
        name: 'Zebra',
        price: 8,
        purchase_price_ht: null,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ],
    subProducts: [
      {
        id: 'sub-a',
        product_id: 'parent',
        name: 'A',
        created_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'sub-b',
        product_id: 'parent',
        name: 'B',
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ],
    stockUpdates: [
      {
        client_id: 'beta',
        product_id: 'carte',
        sub_product_id: null,
        new_stock: 10,
        created_at: '2026-10-01T00:00:00.000Z',
        invoice_id: null,
      },
      {
        client_id: 'alpha',
        product_id: 'carte',
        sub_product_id: null,
        new_stock: 2,
        created_at: '2026-10-01T00:00:00.000Z',
        invoice_id: null,
      },
      {
        client_id: 'beta',
        product_id: 'affiche',
        sub_product_id: null,
        new_stock: 3,
        created_at: '2026-10-01T00:00:00.000Z',
        invoice_id: null,
      },
      {
        client_id: 'beta',
        product_id: null,
        sub_product_id: 'sub-a',
        new_stock: 6,
        created_at: '2026-10-01T00:00:00.000Z',
        invoice_id: null,
      },
      {
        client_id: 'beta',
        product_id: null,
        sub_product_id: 'sub-b',
        new_stock: 4,
        created_at: '2026-10-01T00:00:00.000Z',
        invoice_id: null,
      },
      {
        client_id: 'beta',
        product_id: 'sans-achat',
        sub_product_id: null,
        new_stock: 10,
        created_at: '2026-10-01T00:00:00.000Z',
        invoice_id: null,
      },
    ],
    clientProductPrices: [
      {
        client_id: 'beta',
        product_id: 'carte',
        custom_price: 12,
        created_at: '2026-01-01T00:00:00.000Z',
        deleted_at: null,
      },
      {
        client_id: 'alpha',
        product_id: 'carte',
        custom_price: 99,
        created_at: '2026-01-01T00:00:00.000Z',
        deleted_at: null,
      },
      {
        client_id: 'beta',
        product_id: 'affiche',
        custom_price: null,
        created_at: '2026-01-01T00:00:00.000Z',
        deleted_at: null,
      },
      {
        client_id: 'beta',
        product_id: 'parent',
        custom_price: 20,
        created_at: '2026-01-01T00:00:00.000Z',
        deleted_at: null,
      },
      {
        client_id: 'beta',
        product_id: 'sans-achat',
        custom_price: 6,
        created_at: '2026-01-01T00:00:00.000Z',
        deleted_at: null,
      },
    ],
  });
}

function testPurchasePriceValuation() {
  const matrix = valuationFixture();

  // Cas 1 et 2 : 10 × 5 € d'achat, pas 8 € de cession ni 12 € de prix client
  assert.equal(matrix.prices.beta.carte, 5);
  assert.equal(matrix.values.beta.carte, 50);
  assert.equal(matrix.prices.alpha.carte, 5);
  assert.equal(matrix.values.alpha.carte, 10);

  // Sous-produits : quantité = somme existante, prix d'achat du parent
  assert.equal(matrix.stocks.beta.parent, 10);
  assert.equal(matrix.prices.beta.parent, 4);
  assert.equal(matrix.values.beta.parent, 40);

  // Prix d'achat absent → N/A, même si un prix de cession existe
  assert.equal(matrix.stocks.beta['sans-achat'], 10);
  assert.equal(matrix.prices.beta['sans-achat'], 'N/A');
  assert.equal(matrix.values.beta['sans-achat'], 'N/A');

  const betaTotal = sumNumericCells([
    matrix.values.beta.affiche,
    matrix.values.beta.carte,
    matrix.values.beta.parent,
    matrix.values.beta['sans-achat'],
  ]);
  assert.equal(matrix.values.beta.affiche, 12);
  assert.equal(betaTotal, 102);

  const grand = sumNumericCells(
    matrix.clients.flatMap((client) =>
      matrix.products.map((product) => matrix.values[client.id][product.id])
    )
  );
  assert.equal(grand, 112);
}

function testMissingPurchasePriceAlert() {
  const endIso = '2026-12-31T22:59:59.999Z';
  const created = '2026-01-01T00:00:00.000Z';
  const moved = '2026-10-01T00:00:00.000Z';
  const client = {
    id: 'c1',
    name: 'Alpha',
    company_name: null,
    client_number: '1',
    created_at: created,
  };
  const assoc = (productId: string, customPrice: number | null) => ({
    client_id: 'c1',
    product_id: productId,
    custom_price: customPrice,
    created_at: created,
    deleted_at: null,
  });

  const complete = buildInventoryMatrix({
    endIso,
    completedInvoiceIds: new Set(),
    clients: [client],
    products: [
      { id: 'ok', name: 'Complet', price: 8, purchase_price_ht: 5, created_at: created },
    ],
    subProducts: [],
    stockUpdates: [
      {
        client_id: 'c1',
        product_id: 'ok',
        sub_product_id: null,
        new_stock: 10,
        created_at: moved,
        invoice_id: null,
      },
    ],
    clientProductPrices: [assoc('ok', 12)],
  });
  assert.deepEqual(listProductsMissingPurchasePrice(complete), []);

  const single = buildInventoryMatrix({
    endIso,
    completedInvoiceIds: new Set(),
    clients: [client],
    products: [
      { id: 'seul', name: 'Carte seule', price: 8, purchase_price_ht: null, created_at: created },
    ],
    subProducts: [],
    stockUpdates: [
      {
        client_id: 'c1',
        product_id: 'seul',
        sub_product_id: null,
        new_stock: 4,
        created_at: moved,
        invoice_id: null,
      },
    ],
    clientProductPrices: [assoc('seul', 12)],
  });
  assert.deepEqual(listProductsMissingPurchasePrice(single), [
    { id: 'seul', name: 'Carte seule' },
  ]);
  assert.equal(
    formatMissingPurchasePriceAlert(1),
    "Attention : 1 produit a un Prix d'achat (HT) non renseigné."
  );
  assert.equal(single.values.c1.seul, 'N/A');

  const several = buildInventoryMatrix({
    endIso,
    completedInvoiceIds: new Set(),
    clients: [
      client,
      {
        id: 'c2',
        name: 'Beta',
        company_name: null,
        client_number: '2',
        created_at: created,
      },
    ],
    products: [
      { id: 'ok', name: 'Complet', price: 8, purchase_price_ht: 5, created_at: created },
      { id: 'zero', name: 'Gratuit', price: 3, purchase_price_ht: 0, created_at: created },
      { id: 'vide', name: 'Hors stock', price: 9, purchase_price_ht: null, created_at: created },
      { id: 'a', name: 'Alpha manquant', price: 8, purchase_price_ht: null, created_at: created },
      { id: 'b', name: 'Beta manquant', price: 7, purchase_price_ht: null, created_at: created },
      { id: 'lot', name: 'Lot', price: 6.5, purchase_price_ht: null, created_at: created },
    ],
    subProducts: [
      { id: 'lot-a', product_id: 'lot', name: 'A', created_at: created },
      { id: 'lot-b', product_id: 'lot', name: 'B', created_at: created },
    ],
    stockUpdates: [
      {
        client_id: 'c1',
        product_id: 'ok',
        sub_product_id: null,
        new_stock: 10,
        created_at: moved,
        invoice_id: null,
      },
      {
        client_id: 'c2',
        product_id: 'ok',
        sub_product_id: null,
        new_stock: 2,
        created_at: moved,
        invoice_id: null,
      },
      {
        client_id: 'c1',
        product_id: 'zero',
        sub_product_id: null,
        new_stock: 3,
        created_at: moved,
        invoice_id: null,
      },
      {
        client_id: 'c1',
        product_id: 'a',
        sub_product_id: null,
        new_stock: 4,
        created_at: moved,
        invoice_id: null,
      },
      {
        client_id: 'c2',
        product_id: 'a',
        sub_product_id: null,
        new_stock: 6,
        created_at: moved,
        invoice_id: null,
      },
      {
        client_id: 'c1',
        product_id: 'b',
        sub_product_id: null,
        new_stock: 1,
        created_at: moved,
        invoice_id: null,
      },
      {
        client_id: 'c1',
        product_id: null,
        sub_product_id: 'lot-a',
        new_stock: 3,
        created_at: moved,
        invoice_id: null,
      },
      {
        client_id: 'c1',
        product_id: null,
        sub_product_id: 'lot-b',
        new_stock: 2,
        created_at: moved,
        invoice_id: null,
      },
    ],
    clientProductPrices: [
      assoc('ok', 99),
      assoc('zero', 15),
      assoc('a', 12),
      { ...assoc('a', 20), client_id: 'c2' },
      assoc('b', 4),
      assoc('lot', 50),
    ],
  });

  const missing = listProductsMissingPurchasePrice(several);
  assert.deepEqual(
    missing.map((product) => product.name),
    ['Alpha manquant', 'Beta manquant', 'Lot']
  );
  assert.equal(new Set(missing.map((product) => product.id)).size, 3);
  assert.equal(several.stocks.c1.lot, 5);
  assert.equal(several.values.c1.lot, 'N/A');
  assert.equal(several.prices.c1.zero, 0);
  assert.equal(several.values.c1.zero, 0);
  assert.equal(
    formatMissingPurchasePriceAlert(missing.length),
    "Attention : 3 produits ont un Prix d'achat (HT) non renseigné."
  );
}

async function testExportMatchesMatrix() {
  const matrix = valuationFixture();
  const buffer = await buildInventoryWorkbook(matrix, '2026-10-07');
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const prices = workbook.getWorksheet("Prix par produit");
  const values = workbook.getWorksheet('Valeur par produit');
  assert.ok(prices);
  assert.ok(values);
  assert.equal(prices.getCell(1, 1).value, "Inventaire — Prix d'achat HT");

  // Produits triés : Affiche, Carte, Coffret, Zebra — clients : Alpha puis Beta
  assert.equal(prices.getCell(4, 4).value, 'Affiche');
  assert.equal(prices.getCell(4, 5).value, 'Carte');
  assert.equal(prices.getCell(5, 5).value, 5);
  assert.equal(prices.getCell(6, 5).value, 5);
  assert.equal(prices.getCell(6, 7).value, 'N/A');

  assert.equal(values.getCell(5, 5).value, 10);
  assert.equal(values.getCell(6, 4).value, 12);
  assert.equal(values.getCell(6, 5).value, 50);
  assert.equal(values.getCell(6, 6).value, 40);
  assert.equal(values.getCell(6, 7).value, 'N/A');
  assert.equal(values.getCell(6, 8).value, 102);
  assert.equal(values.getCell(7, 8).value, 112);
}

async function main() {
  testEndOfDay();
  testEffectiveInvoiceFilter();
  testFacturerMapsMatchInventoryToday();
  testSubProductSumSameAsFacturer();
  testHistoricalExcludesLaterMoves();
  testClientProductDeletedBeforeExportForcesZero();
  testPricesAndClamp();
  testPurchasePriceValuation();
  testMissingPurchasePriceAlert();
  await testExportMatchesMatrix();
  console.log('inventaire calc.selftest: OK');
}

main();
