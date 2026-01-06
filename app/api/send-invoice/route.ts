import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Configuration manquante : RESEND_API_KEY non définie' },
        { status: 500 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const { clientEmail, clientName, pdfBase64, fileName, invoiceDate, senderEmail, senderName, senderCompanyName, senderPhone, documentType, creditNoteDate, invoiceNumber } = await request.json();

    // Validation
    if (!clientEmail || !pdfBase64) {
      return NextResponse.json(
        { error: 'Email du client et PDF requis' },
        { status: 400 }
      );
    }

    // Déterminer le type de document (par défaut: facture)
    const isCreditNote = documentType === 'credit_note' || documentType === 'avoir';
    const isDepositSlip = documentType === 'deposit_slip' || documentType === 'bon_depot';
    
    // Construire le sujet et le message selon le type de document
    let subject: string;
    let messageBody: string;
    
    if (isCreditNote) {
      subject = `Avoir - ${senderCompanyName || 'Dépôt-vente'} du ${creditNoteDate || '___/___/____'}`;
      messageBody = `Vous trouverez ci-joint votre avoir du ${creditNoteDate || '___/___/____'} sur la facture n° ${invoiceNumber || '___'}.`;
    } else if (isDepositSlip) {
      const depositSlipDate = creditNoteDate || invoiceDate; // Utiliser creditNoteDate ou invoiceDate pour la date du bon de dépôt
      subject = `Bon de dépôt - ${senderCompanyName || 'Dépôt-vente'} du ${depositSlipDate || '___/___/____'}`;
      messageBody = `Vous trouverez ci-joint votre bon de dépôt généré le ${depositSlipDate || '___/___/____'}.`;
    } else {
      subject = `Facture - ${senderCompanyName || 'Dépôt-vente'} du ${invoiceDate || '___/___/____'}`;
      messageBody = `Vous trouverez ci-joint votre facture du ${invoiceDate || '___/___/____'}.`;
    }

    // Envoyer l'email
    const { data, error } = await resend.emails.send({
      from: `${senderCompanyName || 'Dépôt-vente'} <contact@gastonstock.com>`, // Domaine générique d'envoi
      to: [clientEmail],
      replyTo: senderEmail || undefined, // Les réponses vont à l'email du profil
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; width: 100%; text-align: left; color: #0f172a; line-height: 1.6;">
          <p style="margin: 0 0 12px 0;">Bonjour,</p>
          <p style="margin: 0 0 12px 0;">
            ${messageBody}
          </p>
          <p style="margin: 0 0 12px 0;">
            Pour toute question ou précision, merci de répondre directement à cette adresse : ${
              senderEmail ? `<strong>${senderEmail}</strong>` : 'votre interlocuteur habituel'
            }.
          </p>
            Bien cordialement,
            <br/>
            ${senderName || ''}${senderCompanyName ? ` - ${senderCompanyName}` : ''}${
              senderPhone ? `<br/>${senderPhone}` : ''
            }
          </p>
        </div>
      `,
      attachments: [
        {
          filename: fileName,
          content: pdfBase64,
        },
      ],
    });

    if (error) {
      console.error('Erreur Resend:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de l\'email' },
      { status: 500 }
    );
  }
}

