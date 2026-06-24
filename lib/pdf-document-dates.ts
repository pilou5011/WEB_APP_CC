import { supabase } from '@/lib/supabase';

export async function fetchPreviousDepositDate(
  clientId: string,
  companyId: string,
  beforeDate: string
): Promise<string | null> {
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

export function appendDepositSlipDateFields(
  doc: { text: (text: string, x: number, y: number) => void; setFont: (font: string, style: string) => void; setFontSize: (size: number) => void },
  x: number,
  yPosition: number,
  depositSlipDate: string,
  responsableName?: string | null
): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Date bon de dépôt : ${new Date(depositSlipDate).toLocaleDateString('fr-FR')}`,
    x,
    yPosition
  );

  const trimmedResponsable = responsableName?.trim();
  if (trimmedResponsable) {
    doc.text(`Nom du responsable : ${trimmedResponsable}`, x, yPosition + 5);
    return yPosition + 12;
  }
  return yPosition + 5;
}

export function appendInvoiceDepositDateFields(
  doc: { text: (text: string, x: number, y: number) => void; setFont: (font: string, style: string) => void; setFontSize: (size: number) => void },
  x: number,
  yPosition: number,
  invoiceDate: string,
  previousDepositDate: string | null,
  responsableName?: string | null
): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Date facture : ${new Date(invoiceDate).toLocaleDateString('fr-FR')}`,
    x,
    yPosition
  );
  yPosition += 5;

  const previousDepositText = previousDepositDate
    ? `Date dépôt précédent : ${new Date(previousDepositDate).toLocaleDateString('fr-FR')}`
    : 'Date dépôt précédent : -';
  doc.text(previousDepositText, x, yPosition);

  const trimmedResponsable = responsableName?.trim();
  if (trimmedResponsable) {
    doc.text(`Nom du responsable : ${trimmedResponsable}`, x, yPosition + 5);
    return yPosition + 12;
  }
  return yPosition + 10;
}
