export function isInvoicePaid(paidAt: string | null | undefined): boolean {
  return Boolean(paidAt);
}

/** Jour civil en France, aligné sur les dates de facturation (sans heure). */
export const INVOICE_CALENDAR_TIME_ZONE = 'Europe/Paris';

export type InvoicePaymentStatus = 'paid' | 'unpaid' | 'overdue';

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

export function isValidCalendarDate(value: string | null | undefined): value is string {
  if (!value) return false;
  const match = CALENDAR_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dt = new Date(year, month - 1, day);
  return dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day;
}

/** YYYY-MM-DD du jour courant dans le fuseau de facturation. */
export function getTodayCalendarIso(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: INVOICE_CALENDAR_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * Échéance effective d'une facture.
 * Date enregistrée si elle existe, sinon date de facture (factures antérieures).
 * Ne recalcule jamais une échéance à partir de la date de facture.
 */
export function resolveEffectiveDueDate(
  storedDueDate: string | null | undefined,
  invoiceDate: string | null | undefined
): string | null {
  if (isValidCalendarDate(storedDueDate)) return storedDueDate.slice(0, 10);
  if (isValidCalendarDate(invoiceDate)) return invoiceDate.slice(0, 10);
  return null;
}

/**
 * Payée si pointée.
 * Retard paiement si impayée et si le jour courant est strictement après l'échéance.
 * Une échéance égale à aujourd'hui reste impayée.
 * Sans échéance valide : impayée, jamais en retard.
 */
export function getInvoicePaymentStatus(
  paidAt: string | null | undefined,
  dueDate: string | null | undefined,
  today = getTodayCalendarIso()
): InvoicePaymentStatus {
  if (isInvoicePaid(paidAt)) return 'paid';
  if (!isValidCalendarDate(dueDate) || !isValidCalendarDate(today)) return 'unpaid';
  if (today.slice(0, 10) > dueDate.slice(0, 10)) return 'overdue';
  return 'unpaid';
}

export function canSendPaymentReminder(
  paidAt: string | null | undefined,
  dueDate: string | null | undefined,
  today = getTodayCalendarIso()
): boolean {
  return getInvoicePaymentStatus(paidAt, dueDate, today) === 'overdue';
}

/**
 * Solde restant dû.
 * Le pointage est binaire (paid_at) : aucun montant partiel n'est stocké.
 * Impayée → total de la facture. Payée → 0.
 */
export function getOutstandingAmount(
  paidAt: string | null | undefined,
  totalAmount: number
): number {
  if (isInvoicePaid(paidAt)) return 0;
  const amount = Number(totalAmount);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * 100) / 100;
}

export type OutstandingPaymentTotals = {
  unpaidCount: number;
  overdueCount: number;
  unpaidAmount: number;
  overdueAmount: number;
};

export function summarizeOutstandingPayments(
  rows: Array<{
    paidAt: string | null;
    dueDate: string | null;
    totalAmount: number;
  }>,
  today = getTodayCalendarIso()
): OutstandingPaymentTotals {
  const totals: OutstandingPaymentTotals = {
    unpaidCount: 0,
    overdueCount: 0,
    unpaidAmount: 0,
    overdueAmount: 0,
  };

  for (const row of rows) {
    if (isInvoicePaid(row.paidAt)) continue;
    const due = getOutstandingAmount(row.paidAt, row.totalAmount);
    totals.unpaidCount += 1;
    totals.unpaidAmount = Math.round((totals.unpaidAmount + due) * 100) / 100;
    if (getInvoicePaymentStatus(row.paidAt, row.dueDate, today) === 'overdue') {
      totals.overdueCount += 1;
      totals.overdueAmount = Math.round((totals.overdueAmount + due) * 100) / 100;
    }
  }

  return totals;
}
