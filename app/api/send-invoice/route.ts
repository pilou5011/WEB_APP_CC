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
    
    const { clientEmail, clientName, pdfBase64, fileName, invoiceDate, senderEmail, senderName, senderCompanyName, senderPhone } = await request.json();

    // Validation
    if (!clientEmail || !pdfBase64) {
      return NextResponse.json(
        { error: 'Email du client et PDF requis' },
        { status: 400 }
      );
    }

    // Envoyer l'email
    const { data, error } = await resend.emails.send({
      from: `${senderCompanyName || 'Dépôt-vente'} <contact@gastonstock.com>`, // Domaine générique d'envoi
      to: [clientEmail],
      replyTo: senderEmail || undefined, // Les réponses vont à l'email du profil
      subject: `Facture - ${senderCompanyName || 'Dépôt-vente'} du ${invoiceDate || '___/___/____'}`,
      html: `
        <div style="font-family: Arial, sans-serif; width: 100%; text-align: left; color: #0f172a; line-height: 1.6;">
          <p style="margin: 0 0 12px 0;">Bonjour,</p>
          <p style="margin: 0 0 12px 0;">
            Vous trouverez ci-joint votre facture du ${invoiceDate || '___/___/____'}.
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

