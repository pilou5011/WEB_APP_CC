import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Configuration manquante : RESEND_API_KEY non définie' },
        { status: 500 }
      );
    }

    const {
      nom,
      prenom,
      email,
      telephone,
      entreprise,
      message,
    } = await request.json();

    if (!nom || !prenom || !email || !telephone || !entreprise || !message) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error } = await resend.emails.send({
      from: 'Gaston Stock <contact@gastonstock.com>',
      to: ['contact@gastonstock.com'],
      replyTo: email,
      subject: `Nouvelle demande de devis - ${entreprise}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
          <h2 style="margin: 0 0 12px 0;">Nouvelle demande de devis</h2>
          <p style="margin: 0 0 8px 0;"><strong>Nom :</strong> ${nom}</p>
          <p style="margin: 0 0 8px 0;"><strong>Prénom :</strong> ${prenom}</p>
          <p style="margin: 0 0 8px 0;"><strong>Email :</strong> ${email}</p>
          <p style="margin: 0 0 8px 0;"><strong>Téléphone :</strong> ${telephone}</p>
          <p style="margin: 0 0 8px 0;"><strong>Entreprise :</strong> ${entreprise}</p>
          <p style="margin: 12px 0 6px 0;"><strong>Message :</strong></p>
          <p style="margin: 0; white-space: pre-wrap;">${message}</p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur serveur send-quote:', error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi de la demande de devis" },
      { status: 500 }
    );
  }
}

