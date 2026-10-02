/** Sous-ensemble minimal d'une ligne BL résolue (évite d'importer le service Supabase). */
export type CashInvoiceResolvedLine = {
  product_id: string;
  product_name: string;
  barcode: string;
  quantity: number;
  productDeleted: boolean;
  subLines: Array<{ sub_product_id: string; sub_product_name: string; quantity: number }>;
};

/** Ligne agrégée pour Facturer (compte ferme) — parent uniquement, sans sous-produits. */
export type CashInvoiceImportLine = {
  productId: string;
  productName: string;
  barcode: string;
  quantity: number;
};

/**
 * Convertit les lignes résolues d'un BL en lignes compte ferme :
 * - produits sans sous-produits → quantité BL ;
 * - produits avec sous-produits → Σ quantités des sous-produits (aucun sous-produit en ligne) ;
 * - agrégation par product_id ;
 * - produits soft-deleted exclus.
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

    const existing = byProduct.get(line.product_id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      byProduct.set(line.product_id, {
        productId: line.product_id,
        productName: line.product_name,
        barcode: line.barcode,
        quantity,
      });
    }
  }

  return Array.from(byProduct.values());
}
