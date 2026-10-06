/**
 * Self-test dates PDF (échéance +30 jours + avance curseur).
 * Exécuter : npx tsx lib/pdf-document-dates.selftest.ts
 */
import assert from 'node:assert/strict';
import {
  PDF_DATE_BLOCK_CURSOR_ADVANCE,
  addCalendarDays,
  appendDepositSlipDateFields,
  appendDeliveryNoteDateFields,
  appendInvoiceDepositDateFields,
  formatPdfDocumentDateFr,
  getSimpleDateBlockDueDateY,
} from './pdf-document-dates';

function makeDoc() {
  const texts: Array<{ text: string; x: number; y: number }> = [];
  return {
    texts,
    setFont() {},
    setFontSize() {},
    text(text: string, x: number, y: number) {
      texts.push({ text, x, y });
    },
  };
}

function testAddCalendarDays() {
  assert.equal(addCalendarDays('2026-10-01', 30), '2026-10-31');
  assert.equal(addCalendarDays('2026-10-15', 30), '2026-11-14');
  assert.equal(addCalendarDays('2026-12-31', 30), '2027-01-30');
  assert.equal(addCalendarDays('2026-01-31', 30), '2026-03-02');
  assert.equal(addCalendarDays('2026-02-01', 30), '2026-03-03');
  assert.equal(addCalendarDays('2026-12-01', 30), '2026-12-31');
  // ISO datetime
  assert.equal(addCalendarDays('2026-10-01T10:00:00.000Z', 30), '2026-10-31');
}

function testFormatFr() {
  assert.equal(formatPdfDocumentDateFr('2026-10-01'), '01/10/2026');
  assert.equal(formatPdfDocumentDateFr('2026-10-31'), '31/10/2026');
}

function testCursorAdvanceUnchangedWithDueDate() {
  const start = 100;
  const doc = makeDoc();
  const end = appendInvoiceDepositDateFields(doc, 15, start, '2026-10-01', null, null);
  assert.equal(end, start + PDF_DATE_BLOCK_CURSOR_ADVANCE.withoutResponsable);
  assert.ok(doc.texts.some((t) => t.text.startsWith("Date d'échéance :")));
  const due = doc.texts.find((t) => t.text.startsWith("Date d'échéance :"));
  assert.equal(due?.y, start + 10);
  assert.match(due!.text, /31\/10\/2026/);

  const doc2 = makeDoc();
  const end2 = appendInvoiceDepositDateFields(
    doc2,
    15,
    start,
    '2026-10-15',
    null,
    'Alice'
  );
  assert.equal(end2, start + PDF_DATE_BLOCK_CURSOR_ADVANCE.withResponsable);
  const due2 = doc2.texts.find((t) => t.text.startsWith("Date d'échéance :"));
  assert.equal(due2?.y, start + 15);
  assert.match(due2!.text, /14\/11\/2026/);
}

function testDepositDeliveryStillAlign() {
  const invY = appendInvoiceDepositDateFields(makeDoc(), 15, 80, '2026-09-15', null, null);
  const depY = appendDepositSlipDateFields(makeDoc(), 15, 80, '2026-09-15', null);
  const delY = appendDeliveryNoteDateFields(makeDoc(), 15, 80, '2026-09-15', null);
  assert.equal(depY, invY);
  assert.equal(delY, invY);
}

function testSimpleDueY() {
  assert.equal(getSimpleDateBlockDueDateY(50, false), 55);
  assert.equal(getSimpleDateBlockDueDateY(50, true), 60);
}

testAddCalendarDays();
testFormatFr();
testCursorAdvanceUnchangedWithDueDate();
testDepositDeliveryStillAlign();
testSimpleDueY();
console.log('pdf-document-dates.selftest: OK');
