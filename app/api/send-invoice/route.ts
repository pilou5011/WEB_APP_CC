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
    
    const { clientEmail, clientName, pdfBase64, fileName } = await request.json();

    // Validation
    if (!clientEmail || !pdfBase64) {
      return NextResponse.json(
        { error: 'Email du client et PDF requis' },
        { status: 400 }
      );
    }

    // Envoyer l'email
    const { data, error } = await resend.emails.send({
      from: 'Cartes de Vœux <onboarding@resend.dev>', // Email de test Resend
      to: [clientEmail],
      subject: `Facture - ${clientName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #334155;">Bonjour,</h2>
          <p style="color: #475569; line-height: 1.6;">
            Veuillez trouver ci-joint votre facture pour les cartes de vœux en dépôt-vente.
          </p>
          <p style="color: #475569; line-height: 1.6;">
            N'hésitez pas à nous contacter si vous avez des questions.
          </p>
          <p style="color: #475569; line-height: 1.6;">
            Cordialement,<br/>
            <strong>L'équipe Cartes de Vœux</strong>
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

