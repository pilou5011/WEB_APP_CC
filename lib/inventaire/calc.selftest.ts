/**
 * Self-test des calculs inventaire (sans framework de test).
 * Exécuter : npx tsx lib/inventaire/calc.selftest.ts
 */
import assert from 'node:assert/strict';
import {
  buildInventoryMatrix,
  buildLatestNewStockMaps,
  clampNonNegativeInt,
  computeValueCell,
  getHistoricalProductStock,
  getInventoryEndOfDayIso,
  resolveCessionPriceHt,
  sumNumericCells,
} from './types';

function testEndOfDay() {
  const iso = getInventoryEndOfDayIso('2026-09-15');
  const d = new Date(iso);
  // Local 23:59:59.999 on that calendar day
  const local = new Date(2026, 8, 15, 23, 59, 59, 999);
  assert.equal(d.getTime(), local.getTime());
}

function testLatestStockIgnoresLaterAndTakesNewest() {
  const { byProduct, bySubProduct } = buildLatestNewStockMaps([
    {
      client_id: 'c1',
      product_id: 'p1',
      sub_product_id: null,
      new_stock: 10,
      created_at: '2026-09-10T10:00:00.000Z',
    },
    {
      client_id: 'c1',
      product_id: 'p1',
      sub_product_id: null,
      new_stock: 25,
      created_at: '2026-09-15T12:00:00.000Z',
    },
    {
      client_id: 'c1',
      product_id: null,
      sub_product_id: 'sp1',
      new_stock: 40,
      created_at: '2026-09-14T08:00:00.000Z',
    },
  ]);
  assert.equal(byProduct.get('c1::p1'), 25);
  assert.equal(bySubProduct.get('c1::sp1'), 40);
}

function testSubProductSum() {
  const { byProduct, bySubProduct } = buildLatestNewStockMaps([
    {
      client_id: 'c1',
      product_id: null,
      sub_product_id: 'a',
      new_stock: 40,
      created_at: '2026-09-01T00:00:00.000Z',
    },
    {
      client_id: 'c1',
      product_id: null,
      sub_product_id: 'b',
      new_stock: 35,
      created_at: '2026-09-01T00:00:00.000Z',
    },
    {
      client_id: 'c1',
      product_id: null,
      sub_product_id: 'c',
      new_stock: 25,
      created_at: '2026-09-01T00:00:00.000Z',
    },
  ]);
  const qty = getHistoricalProductStock({
    clientId: 'c1',
    productId: 'parent',
    subProductIds: ['a', 'b', 'c'],
    byProduct,
    bySubProduct,
  });
  assert.equal(qty, 100);
}

function testClampNegative() {
  assert.equal(clampNonNegativeInt(-3), 0);
  assert.equal(clampNonNegativeInt(4.9), 4);
}

function testPrices() {
  assert.equal(
    resolveCessionPriceHt({
      catalogPrice: 12.5,
      customPrice: null,
      hasClientProductAssociation: false,
    }),
    12.5
  );
  assert.equal(
    resolveCessionPriceHt({
      catalogPrice: 12.5,
      customPrice: 9,
      hasClientProductAssociation: true,
    }),
    9
  );
  assert.equal(
    resolveCessionPriceHt({
      catalogPrice: null,
      customPrice: null,
      hasClientProductAssociation: false,
    }),
    'N/A'
  );
  assert.equal(computeValueCell('N/A', 10), 'N/A');
  assert.equal(computeValueCell(2.5, 4), 10);
  assert.equal(computeValueCell(2.5, 0), 0);
  assert.equal(sumNumericCells([1, 'N/A', 2.5]), 3.5);
}

function testMatrixExcludesFutureEntitiesAndZerosMissing() {
  // Borne fixe (indépendante du fuseau du runner CI)
  const endIso = '2026-09-15T21:59:59.999Z';
  const matrix = buildInventoryMatrix({
    endIso,
    clients: [
      {
        id: 'c1',
        name: 'Alpha',
        company_name: 'Alpha SA',
        client_number: '001',
        created_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'c2',
        name: 'Future',
        company_name: null,
        client_number: null,
        created_at: '2026-09-20T00:00:00.000Z',
      },
    ],
    products: [
      {
        id: 'p1',
        name: 'Produit A',
        price: 10,
        created_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'p2',
        name: 'Produit futur',
        price: 5,
        created_at: '2026-09-20T00:00:00.000Z',
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
      },
      {
        client_id: 'c1',
        product_id: 'p1',
        sub_product_id: null,
        new_stock: 99,
        created_at: '2026-09-16T10:00:00.000Z',
      },
    ],
    clientProductPrices: [],
  });

  assert.equal(matrix.clients.length, 1);
  assert.equal(matrix.products.length, 1);
  assert.equal(matrix.stocks.c1.p1, 7);
  // Produit jamais chez le client → prix catalogue
  assert.equal(matrix.prices.c1.p1, 10);
  assert.equal(matrix.values.c1.p1, 70);
}

testEndOfDay();
testLatestStockIgnoresLaterAndTakesNewest();
testSubProductSum();
testClampNegative();
testPrices();
testMatrixExcludesFutureEntitiesAndZerosMissing();

console.log('inventaire calc.selftest: OK');
