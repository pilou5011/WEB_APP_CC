/** Échappe le HTML pour les valeurs dynamiques des e-mails de relance. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type PaymentReminderEmailParams = {
  invoiceNumber: string;
  amountLabel: string;
  dueDateLabel: string;
  senderEmail?: string | null;
  senderName?: string | null;
  senderCompanyName?: string | null;
  senderPhone?: string | null;
};

/**
 * Corps HTML de relance — même structure / signature que l'envoi de facture.
 */
export function buildPaymentReminderEmailHtml(params: PaymentReminderEmailParams): string {
  const invoiceNumber = escapeHtml(params.invoiceNumber);
  const amountLabel = escapeHtml(params.amountLabel);
  const dueDateLabel = escapeHtml(params.dueDateLabel);
  const senderEmail = params.senderEmail ? escapeHtml(params.senderEmail) : null;
  const senderName = escapeHtml(params.senderName || '');
  const senderCompanyName = params.senderCompanyName
    ? escapeHtml(params.senderCompanyName)
    : '';
  const senderPhone = params.senderPhone ? escapeHtml(params.senderPhone) : '';

  const contactLine = senderEmail
    ? `<strong>${senderEmail}</strong>`
    : 'votre interlocuteur habituel';

  return `
        <div style="font-family: Arial, sans-serif; width: 100%; text-align: left; color: #0f172a; line-height: 1.6;">
          <p style="margin: 0 0 12px 0;">Bonjour,</p>
          <p style="margin: 0 0 12px 0;">
            Dans le cadre du suivi de nos règlements, la facture n° <strong>${invoiceNumber}</strong>,
            <strong>Montant TTC : ${amountLabel}</strong>, dont l'échéance était fixée au
            <strong>${dueDateLabel}</strong>, apparaît à ce jour comme non réglée dans nos registres.
          </p>
          <p style="margin: 0 0 12px 0;">
            Si le paiement a déjà été effectué, nous vous remercions de bien vouloir nous en informer
            afin que nous puissions mettre à jour notre suivi. Dans le cas contraire, nous vous
            serions reconnaissants de procéder au règlement à votre convenance.
          </p>
          <p style="margin: 0 0 12px 0;">
            N'hésitez pas à nous signaler toute difficulté ou à nous contacter pour toute question
            à cette adresse : ${contactLine}.
          </p>
          <p style="margin: 0 0 12px 0;">
            Je vous remercie pour votre confiance et vous souhaite une excellente journée.
          </p>
          <p style="margin: 0 0 12px 0;">
            Bien cordialement,
            <br/>
            ${senderName}${senderCompanyName ? ` - ${senderCompanyName}` : ''}${
              senderPhone ? `<br/>${senderPhone}` : ''
            }
          </p>
        </div>
      `;
}

export function buildPaymentReminderSubject(invoiceNumber: string): string {
  return `Rappel de paiement – Facture ${invoiceNumber}`;
}
