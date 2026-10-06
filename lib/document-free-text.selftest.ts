/**
 * Self-test texte libre PDF.
 * Exécuter : npx tsx lib/document-free-text.selftest.ts
 */
import assert from 'node:assert/strict';
import {
  DOCUMENT_FREE_TEXT,
  clampDocumentFreeTextInput,
  countDocumentFreeTextLines,
  formatPdfFreeText,
  normalizeDocumentFreeText,
  wrapTextToWidth,
} from './document-free-text';

function testNormalize() {
  assert.equal(normalizeDocumentFreeText('  a\r\nb  '), '  a\nb');
  assert.equal(normalizeDocumentFreeText(null), '');
}

function testWrapThreeLinesMax() {
  const measure = (s: string) => s.length * 5; // 5px / char
  const maxW = 50; // ~10 chars
  const lines = wrapTextToWidth('abcdefghij klmnopqrst uvwxyz0123', measure, maxW);
  assert.ok(lines.length >= 2);
}

function testClampRejectsFourthLine() {
  // Force many short lines via newlines
  const four = 'a\nb\nc\nd';
  const clamped = clampDocumentFreeTextInput(four);
  assert.ok(countDocumentFreeTextLines(clamped) <= DOCUMENT_FREE_TEXT.maxLines);
  assert.ok(!clamped.includes('\nd') || countDocumentFreeTextLines(clamped) <= 3);
}

function testFormatPdfFreeText() {
  const widths: Record<string, number> = {};
  const doc = {
    setFont() {},
    setFontSize() {},
    getTextWidth: (t: string) => t.length * 2,
    splitTextToSize: (text: string, maxWidth: number) => {
      const out: string[] = [];
      let cur = '';
      for (const ch of text.replace(/\n/g, ' ')) {
        if ((cur + ch).length * 2 > maxWidth && cur) {
          out.push(cur);
          cur = ch === ' ' ? '' : ch;
        } else {
          cur += ch;
        }
      }
      if (cur) out.push(cur);
      return out.length ? out : [''];
    },
  };

  const lines = formatPdfFreeText(doc, 'mot '.repeat(80), { maxWidthMm: 40, maxLines: 3 });
  assert.equal(lines.length, 3);
  assert.equal(formatPdfFreeText(doc, null).length, 0);
  assert.equal(formatPdfFreeText(doc, '   ').length, 0);
}

testNormalize();
testWrapThreeLinesMax();
testClampRejectsFourthLine();
testFormatPdfFreeText();
console.log('document-free-text.selftest: OK');
