/**
 * Self-test — conversion BL → lignes Facturer (compte ferme)
 * Exécuter : npx tsx lib/delivery-notes/cash-invoice-import.selftest.ts
 */
import {
  convertResolvedLinesToCashInvoiceLines,
  type CashInvoiceResolvedLine,
} from './cash-invoice-convert';

function assertEq<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// Produit simple sans sous-produits
{
  const lines: CashInvoiceResolvedLine[] = [
    {
      product_id: 'a',
      product_name: 'Produit A',
      barcode: '111',
      quantity: 10,
      subLines: [],
      productDeleted: false,
    },
  ];
  const result = convertResolvedLinesToCashInvoiceLines(lines);
  assertEq(result.length, 1, 'simple length');
  assertEq(result[0].quantity, 10, 'simple qty');
  assertEq(result[0].productId, 'a', 'simple id');
}

// Parent avec sous-produits → somme, aucun sous en ligne
{
  const lines: CashInvoiceResolvedLine[] = [
    {
      product_id: 'tshirt',
      product_name: 'T-shirt',
      barcode: '',
      quantity: 999,
      subLines: [
        { sub_product_id: 'r', sub_product_name: 'Rouge', quantity: 5 },
        { sub_product_id: 'b', sub_product_name: 'Bleu', quantity: 7 },
        { sub_product_id: 'v', sub_product_name: 'Vert', quantity: 3 },
      ],
      productDeleted: false,
    },
  ];
  const result = convertResolvedLinesToCashInvoiceLines(lines);
  assertEq(result.length, 1, 'subs length');
  assertEq(result[0].productId, 'tshirt', 'subs parent id');
  assertEq(result[0].quantity, 15, 'subs sum');
}

// Plusieurs parents
{
  const lines: CashInvoiceResolvedLine[] = [
    {
      product_id: 'a',
      product_name: 'Produit A',
      barcode: '',
      quantity: 0,
      subLines: [
        { sub_product_id: 'a1', sub_product_name: 'A1', quantity: 5 },
        { sub_product_id: 'a2', sub_product_name: 'A2', quantity: 8 },
      ],
      productDeleted: false,
    },
    {
      product_id: 'b',
      product_name: 'Produit B',
      barcode: '',
      quantity: 0,
      subLines: [
        { sub_product_id: 'b1', sub_product_name: 'B1', quantity: 4 },
        { sub_product_id: 'b2', sub_product_name: 'B2', quantity: 6 },
      ],
      productDeleted: false,
    },
  ];
  const result = convertResolvedLinesToCashInvoiceLines(lines);
  assertEq(result.length, 2, 'multi parents length');
  assertEq(result.find((l) => l.productId === 'a')?.quantity, 13, 'A qty');
  assertEq(result.find((l) => l.productId === 'b')?.quantity, 10, 'B qty');
}

// Doublons parent sans sous → agrégation
{
  const lines: CashInvoiceResolvedLine[] = [
    {
      product_id: 'a',
      product_name: 'Produit A',
      barcode: '',
      quantity: 5,
      subLines: [],
      productDeleted: false,
    },
    {
      product_id: 'a',
      product_name: 'Produit A',
      barcode: '',
      quantity: 3,
      subLines: [],
      productDeleted: false,
    },
  ];
  const result = convertResolvedLinesToCashInvoiceLines(lines);
  assertEq(result.length, 1, 'dup length');
  assertEq(result[0].quantity, 8, 'dup qty');
}

// Soft-deleted exclu
{
  const lines: CashInvoiceResolvedLine[] = [
    {
      product_id: 'gone',
      product_name: 'Gone',
      barcode: '',
      quantity: 10,
      subLines: [],
      productDeleted: true,
    },
  ];
  const result = convertResolvedLinesToCashInvoiceLines(lines);
  assertEq(result.length, 0, 'deleted excluded');
}

console.log('cash-invoice-import.selftest: OK');
