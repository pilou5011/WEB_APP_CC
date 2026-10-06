/**
 * Nom de pièce jointe identique à l'envoi de facture
 * (components/global-invoice-dialog.tsx).
 * Le jour est celui du fuseau de facturation, pour un résultat stable côté serveur.
 */
export function buildInvoiceEmailFileName(clientName: string, createdAt: string): string {
  const dateLabel = new Date(createdAt)
    .toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })
    .replace(/\//g, '-');
  const safeClient = clientName.replace(/[^a-z0-9]/gi, '_');
  return `Facture_${safeClient}_${dateLabel}.pdf`;
}
