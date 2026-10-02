/**
 * Texte libre documents PDF — contraintes partagées UI + génération.
 *
 * Zone : encart client (largeur 80 mm, marge texte 2 mm → 76 mm utiles).
 * Police PDF : Helvetica 9 pt (normale pour le corps du free text).
 * Max 3 lignes ; troncature propre sans ellipsis.
 */

export const DOCUMENT_FREE_TEXT = {
  /** Largeur utile du texte dans l'encart (mm) */
  maxWidthMm: 76,
  maxLines: 3,
  fontSizePt: 9,
  /** Interligne vertical pour le dessin PDF (mm) */
  lineHeightMm: 4,
  /**
   * Budget caractères conservateur (Helvetica 9, texte FR mixte).
   * La vraie limite est le wrapping 3 lignes ; maxlength est un filet UI.
   */
  softMaxChars: 220,
} as const;

/** Normalise les retours ligne et espaces extrêmes. */
export function normalizeDocumentFreeText(raw: string | null | undefined): string {
  if (raw == null) return '';
  return String(raw)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .trimEnd();
}

/**
 * Découpe en lignes comme jsPDF splitTextToSize (approx. largeur fixe).
 * Utilisé côté UI (canvas) pour bloquer une 4e ligne avant sauvegarde.
 */
export function wrapTextToWidth(
  text: string,
  measureWidth: (segment: string) => number,
  maxWidth: number
): string[] {
  const normalized = normalizeDocumentFreeText(text);
  if (!normalized) return [];

  const paragraphs = normalized.split('\n');
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph === '') {
      lines.push('');
      continue;
    }
    const words = paragraph.split(/(\s+)/);
    let current = '';
    for (const token of words) {
      const candidate = current + token;
      if (current && measureWidth(candidate) > maxWidth) {
        lines.push(current.replace(/\s+$/, ''));
        current = token.replace(/^\s+/, '');
        // Token plus long que la largeur → coupe caractère par caractère
        while (measureWidth(current) > maxWidth && current.length > 1) {
          let cut = current.length - 1;
          while (cut > 1 && measureWidth(current.slice(0, cut)) > maxWidth) cut--;
          lines.push(current.slice(0, cut));
          current = current.slice(cut);
        }
      } else {
        current = candidate;
      }
    }
    if (current !== '' || paragraph === '') {
      lines.push(current.replace(/\s+$/, ''));
    }
  }

  return lines;
}

/** Mesure canvas (UI) — Helvetica ≈ Arial. */
export function measureTextWidthPx(text: string, fontSizePt: number): number {
  if (typeof document === 'undefined') {
    // SSR / Node : estimation ~0.45em * length
    return text.length * fontSizePt * 0.45;
  }
  const canvas = measureTextWidthPx._canvas || (measureTextWidthPx._canvas = document.createElement('canvas'));
  const ctx = canvas.getContext('2d');
  if (!ctx) return text.length * fontSizePt * 0.45;
  ctx.font = `${fontSizePt}pt Helvetica, Arial, sans-serif`;
  return ctx.measureText(text).width;
}
measureTextWidthPx._canvas = null as HTMLCanvasElement | null;

/** mm → px à 96 dpi (référence navigateur). */
export function mmToPx(mm: number): number {
  return (mm * 96) / 25.4;
}

/**
 * Tronque la saisie pour respecter maxLines × maxWidth (UI).
 * Retourne le texte acceptable (sans provoquer une 4e ligne).
 */
export function clampDocumentFreeTextInput(raw: string): string {
  const maxPx = mmToPx(DOCUMENT_FREE_TEXT.maxWidthMm);
  const measure = (s: string) => measureTextWidthPx(s, DOCUMENT_FREE_TEXT.fontSizePt);

  // Filet caractères
  let text = raw.length > DOCUMENT_FREE_TEXT.softMaxChars
    ? raw.slice(0, DOCUMENT_FREE_TEXT.softMaxChars)
    : raw;

  // Boucle : si trop de lignes, retirer des caractères à la fin
  for (let i = 0; i < 500; i++) {
    const lines = wrapTextToWidth(text, measure, maxPx);
    if (lines.length <= DOCUMENT_FREE_TEXT.maxLines) {
      return text;
    }
    if (text.length === 0) return '';
    text = text.slice(0, -1);
  }
  return text;
}

export function countDocumentFreeTextLines(raw: string): number {
  const maxPx = mmToPx(DOCUMENT_FREE_TEXT.maxWidthMm);
  const measure = (s: string) => measureTextWidthPx(s, DOCUMENT_FREE_TEXT.fontSizePt);
  return wrapTextToWidth(raw, measure, maxPx).length;
}

/**
 * Format pour jsPDF : au plus maxLines, largeur maxWidthMm, police Helvetica.
 * Troncature propre (pas de « ... »).
 */
export function formatPdfFreeText(
  doc: {
    setFont: (font: string, style: string) => void;
    setFontSize: (size: number) => void;
    splitTextToSize: (text: string, maxWidth: number) => string[];
    getTextWidth: (text: string) => number;
  },
  raw: string | null | undefined,
  options?: {
    maxWidthMm?: number;
    maxLines?: number;
    fontSize?: number;
    fontStyle?: 'normal' | 'bold';
  }
): string[] {
  const maxWidthMm = options?.maxWidthMm ?? DOCUMENT_FREE_TEXT.maxWidthMm;
  const maxLines = options?.maxLines ?? DOCUMENT_FREE_TEXT.maxLines;
  const fontSize = options?.fontSize ?? DOCUMENT_FREE_TEXT.fontSizePt;
  const fontStyle = options?.fontStyle ?? 'normal';

  const normalized = normalizeDocumentFreeText(raw);
  if (!normalized) return [];

  doc.setFont('helvetica', fontStyle);
  doc.setFontSize(fontSize);

  const wrapped = doc.splitTextToSize(normalized, maxWidthMm);
  if (wrapped.length <= maxLines) {
    return wrapped;
  }

  const lines = wrapped.slice(0, maxLines);
  // Garantit que la dernière ligne tient encore (splitTextToSize l'a déjà taillée)
  let last = lines[maxLines - 1] ?? '';
  while (last.length > 0 && doc.getTextWidth(last) > maxWidthMm) {
    last = last.slice(0, -1);
  }
  lines[maxLines - 1] = last;
  return lines;
}

/**
 * Dessine le texte libre sous les infos de l'encart, sans avancer le curseur layout.
 * @param layoutCursorY — Y layout figé (fin encart actuelle, avant le +10)
 * @returns void — n'affecte pas le positionnement des éléments suivants
 */
export function drawPdfClientInfoFreeText(params: {
  doc: {
    setFont: (font: string, style: string) => void;
    setFontSize: (size: number) => void;
    setTextColor: (r: number, g: number, b: number) => void;
    text: (text: string, x: number, y: number) => void;
    splitTextToSize: (text: string, maxWidth: number) => string[];
    getTextWidth: (text: string) => number;
  };
  freeText: string | null | undefined;
  textX: number;
  /** Baseline de la dernière ligne d'infos (N° Client / Facture / …) */
  lastInfoBaselineY: number;
}): void {
  const lines = formatPdfFreeText(params.doc, params.freeText);
  if (lines.length === 0) return;

  params.doc.setFont('helvetica', 'normal');
  params.doc.setFontSize(DOCUMENT_FREE_TEXT.fontSizePt);
  params.doc.setTextColor(0, 0, 0);

  // Première ligne de free text : même pas que Client→Facture (5 mm)
  let y = params.lastInfoBaselineY + 5;
  for (const line of lines) {
    params.doc.text(line, params.textX, y);
    y += DOCUMENT_FREE_TEXT.lineHeightMm;
  }
}
