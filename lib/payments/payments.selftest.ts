/**
 * Self-test — échéances et e-mail de relance
 * Exécuter : npx tsx lib/payments/payments.selftest.ts
 */
import {
  isInvoicePaid,
  resolveEffectiveDueDate,
  getInvoicePaymentStatus,
  canSendPaymentReminder,
  getTodayCalendarIso,
  getOutstandingAmount,
  summarizeOutstandingPayments,
} from './due-date';
import { buildInvoiceEmailFileName } from './invoice-attachment';
import { formatInvoiceAmountFr, invoiceTotalTtcFromStoredHt } from './invoice-amount';
import { comparePaymentInvoicesDesc } from './sort-invoices';
import {
  buildPaymentReminderSubject,
  escapeHtml,
  buildPaymentReminderEmailHtml,
} from './email-html';

function assertEq<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

assertEq(
  resolveEffectiveDueDate('2026-11-30', '2026-10-07'),
  '2026-11-30',
  'stored due date'
);
assertEq(
  resolveEffectiveDueDate(null, '2026-09-15'),
  '2026-09-15',
  'legacy fallback is invoice date'
);
assertEq(
  resolveEffectiveDueDate(undefined, '2026-09-15'),
  '2026-09-15',
  'missing due date fallback'
);
assertEq(resolveEffectiveDueDate('pas-une-date', '2026-09-15'), '2026-09-15', 'invalid stored due');
assertEq(resolveEffectiveDueDate(null, null), null, 'both missing');
assertEq(resolveEffectiveDueDate('2026-02-31', '2026-09-15'), '2026-09-15', 'impossible stored due');
assertEq(isInvoicePaid(null), false, 'unpaid null');
assertEq(isInvoicePaid('2026-03-01T10:00:00Z'), true, 'paid');

assertEq(
  buildPaymentReminderSubject('FAC-2026-001'),
  'Rappel de paiement – Facture FAC-2026-001',
  'subject'
);

assertEq(escapeHtml('<script>'), '&lt;script&gt;', 'escape');

const html = buildPaymentReminderEmailHtml({
  invoiceNumber: 'FAC-1',
  amountLabel: '12.50 €',
  dueDateLabel: '31/01/2026',
  senderEmail: 'a@b.c',
  senderName: 'Jean',
  senderCompanyName: 'ACME',
  senderPhone: '0600000000',
});
if (!html.includes('FAC-1') || !html.includes('Montant TTC : 12.50 €') || !html.includes('Jean')) {
  throw new Error('reminder html missing fields');
}
if (html.includes('<script>')) {
  throw new Error('unescaped script');
}

assertEq(getInvoicePaymentStatus(null, '2026-03-01', '2026-03-01'), 'unpaid', 'due today');
assertEq(getInvoicePaymentStatus(null, '2026-03-01', '2026-03-02'), 'overdue', 'due past');
assertEq(
  getInvoicePaymentStatus('2026-03-02T10:00:00Z', '2026-03-01', '2026-03-05'),
  'paid',
  'paid stays paid'
);
assertEq(getInvoicePaymentStatus(null, null, '2026-03-02'), 'unpaid', 'missing due');
assertEq(getInvoicePaymentStatus(null, '2026-02-31', '2026-03-02'), 'unpaid', 'invalid due');

assertEq(canSendPaymentReminder(null, '2026-03-01', '2026-03-02'), true, 'remind overdue');
assertEq(canSendPaymentReminder(null, '2026-03-01', '2026-03-01'), false, 'no remind on due day');
assertEq(canSendPaymentReminder('paid', '2026-03-01', '2026-03-05'), false, 'no remind paid');
assertEq(canSendPaymentReminder(null, null, '2026-03-05'), false, 'no remind without due');

if (!/^\d{4}-\d{2}-\d{2}$/.test(getTodayCalendarIso())) {
  throw new Error('today iso format');
}

const fileName = buildInvoiceEmailFileName('Café Martin', '2026-04-06T22:30:00.000Z');
assertEq(fileName, 'Facture_Caf__Martin_07-04-2026.pdf', 'attachment name paris date');

assertEq(getOutstandingAmount(null, 120.5), 120.5, 'unpaid outstanding');
assertEq(getOutstandingAmount('2026-03-02T10:00:00Z', 120.5), 0, 'paid outstanding');
assertEq(getOutstandingAmount(null, Number.NaN), 0, 'invalid amount');

const totals = summarizeOutstandingPayments(
  [
    { paidAt: '2026-04-01', dueDate: '2026-03-01', totalAmount: 999 },
    { paidAt: null, dueDate: '2026-04-10', totalAmount: 40 },
    { paidAt: null, dueDate: '2026-04-06', totalAmount: 10 },
    { paidAt: null, dueDate: '2026-04-01', totalAmount: 25.5 },
    { paidAt: null, dueDate: null, totalAmount: 5 },
  ],
  '2026-04-06'
);
assertEq(totals.unpaidCount, 4, 'unpaid count excludes paid');
assertEq(totals.overdueCount, 1, 'overdue count skips due today');
assertEq(totals.unpaidAmount, 80.5, 'unpaid amount is remaining due');
assertEq(totals.overdueAmount, 25.5, 'overdue amount');

assertEq(invoiceTotalTtcFromStoredHt(100), 120, '100 HT gives 120 TTC');
assertEq(invoiceTotalTtcFromStoredHt(0), 0, 'zero HT stays zero TTC');
assertEq(invoiceTotalTtcFromStoredHt(Number.NaN), 0, 'invalid amount');
assertEq(formatInvoiceAmountFr(invoiceTotalTtcFromStoredHt(100)), '120,00 €', 'email amount label');

const reminderWithTtc = buildPaymentReminderEmailHtml({
  invoiceNumber: 'FAC-2026-0103',
  amountLabel: formatInvoiceAmountFr(invoiceTotalTtcFromStoredHt(100)),
  dueDateLabel: '08/10/2026',
});
if (!reminderWithTtc.includes('Montant TTC : 120,00 €')) {
  throw new Error('reminder html must state the TTC amount');
}
if (reminderWithTtc.includes('100,00') || reminderWithTtc.includes('100.00')) {
  throw new Error('reminder html must not show the HT amount');
}

const sameDay = [
  { id: '0101', invoiceDate: '2026-10-08', createdAt: '2026-10-08T08:00:00.000Z' },
  { id: '0104', invoiceDate: '2026-10-07', createdAt: '2026-10-07T20:00:00.000Z' },
  { id: '0103', invoiceDate: '2026-10-08T00:00:00.000Z', createdAt: '2026-10-08T18:00:00.000Z' },
  { id: '0102', invoiceDate: '2026-10-08', createdAt: '2026-10-08T12:00:00.000Z' },
  { id: 'sans-date', invoiceDate: null, createdAt: '2026-10-09T12:00:00.000Z' },
].sort(comparePaymentInvoicesDesc);
assertEq(
  sameDay.map((row) => row.id).join(','),
  '0103,0102,0101,0104,sans-date',
  'invoice date desc then created_at desc'
);

console.log('payments.selftest: OK');
