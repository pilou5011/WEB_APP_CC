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
  resolveCessionPriceHt,
  sumNumericCells,
} from './types';
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
      { id: 'p1', name: 'X', price: 10, created_at: '2026-01-01T00:00:00.000Z' },
      { id: 'p2', name: 'Y', price: 5, created_at: '2026-01-01T00:00:00.000Z' },
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
        price: 10,
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
  // Prix : association plus active aujourd'hui → prix catalogue
  assert.equal(matrix.prices.c1.p1, 10);
  assert.equal(matrix.values.c1.p1, 0);
}

function testPricesAndClamp() {
  assert.equal(clampNonNegativeInt(-3), 0);
  assert.equal(
    resolveCessionPriceHt({
      catalogPrice: 12.5,
      customPrice: null,
      hasClientProductAssociation: false,
    }),
    12.5
  );
  assert.equal(computeValueCell('N/A', 10), 'N/A');
  assert.equal(sumNumericCells([1, 'N/A', 2.5]), 3.5);
}

testEndOfDay();
testEffectiveInvoiceFilter();
testFacturerMapsMatchInventoryToday();
testSubProductSumSameAsFacturer();
testHistoricalExcludesLaterMoves();
testClientProductDeletedBeforeExportForcesZero();
testPricesAndClamp();

console.log('inventaire calc.selftest: OK');
