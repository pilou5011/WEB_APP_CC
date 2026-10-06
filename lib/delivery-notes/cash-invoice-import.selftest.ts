/**
 * Self-test — conversion BL → lignes Facturer (compte ferme) + pricing
 * Exécuter : npx tsx lib/delivery-notes/cash-invoice-import.selftest.ts
 */
import {
  convertResolvedLinesToCashInvoiceLines,
  type CashInvoiceResolvedLine,
} from './cash-invoice-convert';
import {
  findCessionPriceConflicts,
  moneyEquals,
  resolveDeliveryNotePdfPrices,
  resolveDepositCustomPriceUpdatesFromBl,
  resolveEffectiveDeliveryNotePrices,
  resolveReferencePrices,
} from './pricing';

function assertEq<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// Produit simple sans sous-produits + prix figé BL
{
  const lines: CashInvoiceResolvedLine[] = [
    {
      product_id: 'a',
      product_name: 'Produit A',
      barcode: '111',
      quantity: 10,
      subLines: [],
      productDeleted: false,
      unit_price_ht: 3.5,
      product_price: 2,
    },
  ];
  const result = convertResolvedLinesToCashInvoiceLines(lines);
  assertEq(result.length, 1, 'simple length');
  assertEq(result[0].quantity, 10, 'simple qty');
  assertEq(result[0].unitPriceHt, 3.5, 'simple price from BL');
}

// Ancien BL sans prix → fallback catalogue
{
  const lines: CashInvoiceResolvedLine[] = [
    {
      product_id: 'a',
      product_name: 'Produit A',
      barcode: '',
      quantity: 5,
      subLines: [],
      productDeleted: false,
      unit_price_ht: null,
      product_price: 4.2,
    },
  ];
  const result = convertResolvedLinesToCashInvoiceLines(lines);
  assertEq(result[0].unitPriceHt, 4.2, 'legacy fallback price');
}

// Parent avec sous-produits → somme
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
      unit_price_ht: 12,
      product_price: 10,
    },
  ];
  const result = convertResolvedLinesToCashInvoiceLines(lines);
  assertEq(result.length, 1, 'subs length');
  assertEq(result[0].quantity, 15, 'subs sum');
  assertEq(result[0].unitPriceHt, 12, 'parent BL price');
}

// Référence : produit présent dépôt
{
  const ref = resolveReferencePrices(
    { price: 10, recommended_sale_price: 15 },
    { custom_price: 8, custom_recommended_sale_price: null }
  );
  assertEq(ref.cessionHt, 8, 'deposit custom ht');
  assertEq(ref.recommendedTtc, 15, 'fallback catalog ttc');
  assertEq(ref.lockedFromDeposit, true, 'locked');
}

// Draft custom conserve la valeur
{
  const effective = resolveEffectiveDeliveryNotePrices({
    line: {
      unit_price_ht: 7,
      recommended_sale_price_ttc: null,
      unit_price_ht_is_custom: true,
      recommended_sale_price_ttc_is_custom: false,
    },
    product: { price: 10, recommended_sale_price: 20 },
    clientOverride: null,
    isDraft: true,
  });
  assertEq(effective.cessionHt, 7, 'custom draft ht');
  assertEq(effective.recommendedTtc, 20, 'inherited ttc');
}

// Conflits HT
{
  const conflicts = findCessionPriceConflicts([
    {
      productId: 'a',
      productName: 'A',
      blCessionHt: 10,
      depositCessionHt: 10.001, // arrondi 2 décimales → égal → pas de conflit
    },
    {
      productId: 'b',
      productName: 'B',
      blCessionHt: 5,
      depositCessionHt: 6,
    },
    {
      productId: 'c',
      productName: 'C',
      blCessionHt: 3,
      depositCessionHt: null, // nouveau produit → pas de conflit
    },
  ]);
  assertEq(conflicts.length, 1, 'one conflict');
  assertEq(conflicts[0].productId, 'b', 'conflict product');
}

// moneyEquals 2 décimales
assertEq(moneyEquals(10, 10.004), true, 'round equal');
assertEq(moneyEquals(10, 10.006), false, 'round unequal');
assertEq(moneyEquals(10, 10.001), true, '10 vs 10.001 equal at 2dp');

// PDF : prix figés BL (spécifiques) — ignore catalogue différent
{
  const pdf = resolveDeliveryNotePdfPrices({
    line: {
      unit_price_ht: 7.5,
      recommended_sale_price_ttc: 14.9,
      unit_price_ht_is_custom: true,
      recommended_sale_price_ttc_is_custom: true,
    },
    product: { price: 10, recommended_sale_price: 20 },
    clientOverride: { custom_price: 9, custom_recommended_sale_price: 18 },
  });
  assertEq(pdf.cessionHt, 7.5, 'pdf custom ht from BL');
  assertEq(pdf.recommendedTtc, 14.9, 'pdf custom ttc from BL');
}

// PDF : prix figés hérités (non custom) après validation
{
  const pdf = resolveDeliveryNotePdfPrices({
    line: {
      unit_price_ht: 10,
      recommended_sale_price_ttc: 20,
      unit_price_ht_is_custom: false,
      recommended_sale_price_ttc_is_custom: false,
    },
    product: { price: 99, recommended_sale_price: 199 },
    clientOverride: null,
  });
  assertEq(pdf.cessionHt, 10, 'pdf frozen inherited ht');
  assertEq(pdf.recommendedTtc, 20, 'pdf frozen inherited ttc');
}

// PDF : ancien BL sans colonnes prix → fallback référence
{
  const pdf = resolveDeliveryNotePdfPrices({
    line: {
      unit_price_ht: null,
      recommended_sale_price_ttc: null,
      unit_price_ht_is_custom: false,
      recommended_sale_price_ttc_is_custom: false,
    },
    product: { price: 5, recommended_sale_price: 8 },
    clientOverride: null,
  });
  assertEq(pdf.cessionHt, 5, 'pdf legacy catalog ht');
  assertEq(pdf.recommendedTtc, 8, 'pdf legacy catalog ttc');
}

// Import dépôt : persister prix spécifiques BL si custom_* absents
{
  const u = resolveDepositCustomPriceUpdatesFromBl({
    unit_price_ht: 7.5,
    recommended_sale_price_ttc: 14.9,
    unit_price_ht_is_custom: true,
    recommended_sale_price_ttc_is_custom: true,
    existingCustomPrice: null,
    existingCustomRecommendedSalePrice: null,
  });
  assertEq(u.custom_price, 7.5, 'deposit set custom ht');
  assertEq(u.custom_recommended_sale_price, 14.9, 'deposit set custom ttc');
}

// Import dépôt : ne pas écraser custom_* existants
{
  const u = resolveDepositCustomPriceUpdatesFromBl({
    unit_price_ht: 7.5,
    recommended_sale_price_ttc: 14.9,
    unit_price_ht_is_custom: true,
    recommended_sale_price_ttc_is_custom: true,
    existingCustomPrice: 7.5,
    existingCustomRecommendedSalePrice: 12,
  });
  assertEq(u.custom_price, undefined, 'deposit keep existing ht');
  assertEq(u.custom_recommended_sale_price, undefined, 'deposit keep existing ttc');
}

// Import dépôt : prix hérités BL → pas de custom_*
{
  const u = resolveDepositCustomPriceUpdatesFromBl({
    unit_price_ht: 10,
    recommended_sale_price_ttc: 20,
    unit_price_ht_is_custom: false,
    recommended_sale_price_ttc_is_custom: false,
    existingCustomPrice: null,
    existingCustomRecommendedSalePrice: null,
  });
  assertEq(u.custom_price, undefined, 'inherited no custom ht');
  assertEq(u.custom_recommended_sale_price, undefined, 'inherited no custom ttc');
}

console.log('cash-invoice-import.selftest: OK');
