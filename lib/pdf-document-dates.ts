/**
 * Avance verticale du curseur après le bloc dates, alignée sur la facture dépôt
 * (2 lignes de dates : « Date facture » + « Date dépôt précédent »).
 *
 * Sans responsable : titre à blockStart + 15
 * Avec responsable : titre à blockStart + 17
 *
 * Les bons de dépôt / livraison n'affichent qu'une ligne de date mais doivent
 * avancer le curseur de la même façon pour aligner titre + tableau sur la facture.
 * Les textes déjà dessinés (date, responsable) restent à leurs positions relatives actuelles.
 */
export const PDF_DATE_BLOCK_CURSOR_ADVANCE = {
  withoutResponsable: 15,
  withResponsable: 17,
} as const;

/** Interligne vertical des lignes de date (mm), Helvetica 9. */
export const PDF_DATE_LINE_GAP_MM = 5;

export async function fetchPreviousDepositDate(
  clientId: string,
  companyId: string,
  beforeDate: string
): Promise<string | null> {
  const { supabase } = await import('@/lib/supabase');
  const { data: previousInvoice, error } = await supabase
    .from('invoices')
    .select('created_at')
    .eq('client_id', clientId)
    .eq('company_id', companyId)
    .lt('created_at', beforeDate)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return previousInvoice?.created_at || null;
}

/**
 * Parse une date document (YYYY-MM-DD ou ISO) en composants calendaires locaux.
 * Évite les décalages UTC de `new Date('YYYY-MM-DD')`.
 */
export function parseDocumentDateParts(isoOrDate: string): {
  year: number;
  month: number;
  day: number;
} {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoOrDate);
  if (match) {
    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
    };
  }
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Date document invalide: ${isoOrDate}`);
  }
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  };
}

/** Ajoute N jours calendaires à une date d'émission document. Retourne YYYY-MM-DD. */
export function addCalendarDays(isoOrDate: string, days: number): string {
  const { year, month, day } = parseDocumentDateParts(isoOrDate);
  const dt = new Date(year, month - 1, day);
  dt.setDate(dt.getDate() + days);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Format fr-FR identique aux autres dates PDF (JJ/MM/AAAA). */
export function formatPdfDocumentDateFr(isoOrDate: string): string {
  const { year, month, day } = parseDocumentDateParts(isoOrDate);
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR');
}

/**
 * Dessine « Date d'échéance : … » à une position fixe (aucun reflow).
 * La date affichée est celle déjà retenue (enregistrée, ou date facture en secours).
 */
export function drawPdfDueDateLine(
  doc: {
    text: (text: string, x: number, y: number) => void;
    setFont: (font: string, style: string) => void;
    setFontSize: (size: number) => void;
  },
  x: number,
  y: number,
  dueDate: string
): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Date d'échéance : ${formatPdfDocumentDateFr(dueDate)}`, x, y);
}

/**
 * Baseline Y pour la ligne d'échéance sous un bloc dates simple
 * (1 ligne « Date: … », responsable optionnel à +5) — sans avancer le curseur.
 */
export function getSimpleDateBlockDueDateY(
  dateBlockStartY: number,
  hasResponsable: boolean
): number {
  // Sans responsable : place dans le vide à +5 (entre date et titre à +10)
  // Avec responsable : place à +10 (entre responsable à +5 et titre à +12)
  return hasResponsable
    ? dateBlockStartY + PDF_DATE_LINE_GAP_MM * 2
    : dateBlockStartY + PDF_DATE_LINE_GAP_MM;
}

export function appendDepositSlipDateFields(
  doc: {
    text: (text: string, x: number, y: number) => void;
    setFont: (font: string, style: string) => void;
    setFontSize: (size: number) => void;
  },
  x: number,
  yPosition: number,
  depositSlipDate: string,
  responsableName?: string | null
): number {
  const blockStart = yPosition;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Date bon de dépôt : ${formatPdfDocumentDateFr(depositSlipDate)}`,
    x,
    yPosition
  );

  const trimmedResponsable = responsableName?.trim();
  if (trimmedResponsable) {
    doc.text(
      `Nom du responsable : ${trimmedResponsable}`,
      x,
      yPosition + PDF_DATE_LINE_GAP_MM
    );
    return blockStart + PDF_DATE_BLOCK_CURSOR_ADVANCE.withResponsable;
  }
  return blockStart + PDF_DATE_BLOCK_CURSOR_ADVANCE.withoutResponsable;
}

export function appendDeliveryNoteDateFields(
  doc: {
    text: (text: string, x: number, y: number) => void;
    setFont: (font: string, style: string) => void;
    setFontSize: (size: number) => void;
  },
  x: number,
  yPosition: number,
  deliveryNoteDate: string,
  responsableName?: string | null
): number {
  const blockStart = yPosition;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Date bon de livraison : ${formatPdfDocumentDateFr(deliveryNoteDate)}`,
    x,
    yPosition
  );

  const trimmedResponsable = responsableName?.trim();
  if (trimmedResponsable) {
    doc.text(
      `Nom du responsable : ${trimmedResponsable}`,
      x,
      yPosition + PDF_DATE_LINE_GAP_MM
    );
    return blockStart + PDF_DATE_BLOCK_CURSOR_ADVANCE.withResponsable;
  }
  return blockStart + PDF_DATE_BLOCK_CURSOR_ADVANCE.withoutResponsable;
}

export function appendInvoiceDepositDateFields(
  doc: {
    text: (text: string, x: number, y: number) => void;
    setFont: (font: string, style: string) => void;
    setFontSize: (size: number) => void;
  },
  x: number,
  yPosition: number,
  invoiceDate: string,
  previousDepositDate: string | null,
  responsableName?: string | null,
  dueDate?: string | null
): number {
  const blockStart = yPosition;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Date facture : ${formatPdfDocumentDateFr(invoiceDate)}`, x, yPosition);
  yPosition += PDF_DATE_LINE_GAP_MM;

  const previousDepositText = previousDepositDate
    ? `Date dépôt précédent : ${formatPdfDocumentDateFr(previousDepositDate)}`
    : 'Date dépôt précédent : -';
  doc.text(previousDepositText, x, yPosition);

  const trimmedResponsable = responsableName?.trim();
  if (trimmedResponsable) {
    doc.text(
      `Nom du responsable : ${trimmedResponsable}`,
      x,
      yPosition + PDF_DATE_LINE_GAP_MM
    );
  }

  // Date d'échéance dans l'espace libre (ne modifie PAS le curseur / titre / tableau)
  // Sans responsable : à +10 (vide entre dépôt précédent +5 et titre +15)
  // Avec responsable : à +15 (entre responsable +10 et titre +17)
  const dueY = trimmedResponsable
    ? blockStart + PDF_DATE_LINE_GAP_MM * 3
    : blockStart + PDF_DATE_LINE_GAP_MM * 2;
  drawPdfDueDateLine(doc, x, dueY, dueDate?.trim() ? dueDate : invoiceDate);

  if (trimmedResponsable) {
    return blockStart + PDF_DATE_BLOCK_CURSOR_ADVANCE.withResponsable;
  }
  return blockStart + PDF_DATE_BLOCK_CURSOR_ADVANCE.withoutResponsable;
}
