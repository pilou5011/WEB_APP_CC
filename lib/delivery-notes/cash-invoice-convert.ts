/** Sous-ensemble minimal d'une ligne BL résolue (évite d'importer le service Supabase). */
export type CashInvoiceResolvedLine = {
  product_id: string;
  product_name: string;
  barcode: string;
  quantity: number;
  productDeleted: boolean;
  /** Prix HT figé du BL (ou null pour anciens BL → fallback catalogue côté appelant) */
  unit_price_ht: number | null;
  product_price: number | null;
  subLines: Array<{ sub_product_id: string; sub_product_name: string; quantity: number }>;
};

/** Ligne agrégée pour Facturer (compte ferme) — parent uniquement, sans sous-produits. */
export type CashInvoiceImportLine = {
  productId: string;
  productName: string;
  barcode: string;
  quantity: number;
  /** Prix de cession HT issu du BL (figé) */
  unitPriceHt: number;
};

/**
 * Convertit les lignes résolues d'un BL en lignes compte ferme :
 * - produits sans sous-produits → quantité BL ;
 * - produits avec sous-produits → Σ quantités des sous-produits (aucun sous-produit en ligne) ;
 * - agrégation par product_id ;
 * - produits soft-deleted exclus ;
 * - prix = unit_price_ht figé du BL, sinon product_price catalogue.
 */
export function convertResolvedLinesToCashInvoiceLines(
  resolved: CashInvoiceResolvedLine[]
): CashInvoiceImportLine[] {
  const byProduct = new Map<string, CashInvoiceImportLine>();

  for (const line of resolved) {
    if (line.productDeleted) continue;

    const quantity =
      line.subLines.length > 0
        ? line.subLines.reduce((sum, sub) => sum + (sub.quantity || 0), 0)
        : line.quantity || 0;

    if (quantity <= 0) continue;

    const unitPriceHt =
      line.unit_price_ht != null ? line.unit_price_ht : (line.product_price ?? 0);

    const existing = byProduct.get(line.product_id);
    if (existing) {
      existing.quantity += quantity;
      // Conserver le premier prix rencontré (lignes tropique du même parent)
    } else {
      byProduct.set(line.product_id, {
        productId: line.product_id,
        productName: line.product_name,
        barcode: line.barcode,
        quantity,
        unitPriceHt,
      });
    }
  }

  return Array.from(byProduct.values());
}
