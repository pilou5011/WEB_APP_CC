export type PaymentInvoiceSortKey = {
  invoiceDate: string | null;
  createdAt: string | null;
};

function invoiceDay(value: string | null): string {
  return (value || '').slice(0, 10);
}

function createdAtMillis(value: string | null): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
}

/**
 * Date de facture décroissante, puis horodatage de création décroissant
 * pour les factures du même jour. Les dates absentes passent en dernier.
 */
export function comparePaymentInvoicesDesc(
  a: PaymentInvoiceSortKey,
  b: PaymentInvoiceSortKey
): number {
  const dayA = invoiceDay(a.invoiceDate);
  const dayB = invoiceDay(b.invoiceDate);
  if (dayA !== dayB) {
    if (!dayA) return 1;
    if (!dayB) return -1;
    return dayA < dayB ? 1 : -1;
  }
  const timeA = createdAtMillis(a.createdAt);
  const timeB = createdAtMillis(b.createdAt);
  if (timeA === timeB) return 0;
  return timeB - timeA;
}
