/**
 * Les factures enregistrent le total HT (après remise) dans invoices.total_amount.
 * Le TTC n'est pas stocké : les PDF le calculent avec une TVA de 20 %
 * (TTC = HT + HT × 0,20), puis l'affichent arrondi au centime.
 */
export function invoiceTotalTtcFromStoredHt(totalAmountHt: number): number {
  const ht = Number(totalAmountHt);
  if (!Number.isFinite(ht)) return 0;
  return Number((ht + ht * 0.2).toFixed(2));
}

/** Montant en français, ex. « 120,00 € ». */
export function formatInvoiceAmountFr(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted} €`;
}
