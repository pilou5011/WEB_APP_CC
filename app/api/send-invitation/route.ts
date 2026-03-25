import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import {
  getBearerToken,
  createSupabaseClientWithToken,
} from '@/lib/api-helpers';

function getAppBaseUrl(request: NextRequest): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (site) return site;
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '')}`;
  const origin = request.headers.get('origin');
  if (origin) return origin.replace(/\/$/, '');
  return 'http://localhost:3000';
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Configuration manquante : RESEND_API_KEY non définie' },
        { status: 500 }
      );
    }

    const jwt = getBearerToken(request);
    if (!jwt) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const supabase = createSupabaseClientWithToken(jwt);
    if (!supabase) {
      return NextResponse.json(
        { error: 'Configuration serveur manquante' },
        { status: 500 }
      );
    }

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser(jwt);
    if (!authUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { data: adminRow, error: adminError } = await supabase
      .from('users')
      .select('id, company_id, role, email')
      .eq('id', authUser.id)
      .single();

    if (adminError || !adminRow) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 403 });
    }

    if (adminRow.role !== 'admin' && adminRow.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Seuls les administrateurs peuvent envoyer une invitation' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    if (!token) {
      return NextResponse.json({ error: 'Token d\'invitation requis' }, { status: 400 });
    }

    const { data: invitation, error: invError } = await supabase
      .from('user_invitations')
      .select('id, email, company_id, role, expires_at, accepted_at, token')
      .eq('token', token)
      .maybeSingle();

    if (invError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation introuvable' },
        { status: 404 }
      );
    }

    if (invitation.company_id !== adminRow.company_id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    if (invitation.accepted_at) {
      return NextResponse.json(
        { error: 'Cette invitation a déjà été acceptée' },
        { status: 400 }
      );
    }

    if (new Date(invitation.expires_at) <= new Date()) {
      return NextResponse.json(
        { error: 'Cette invitation a expiré' },
        { status: 400 }
      );
    }

    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', invitation.company_id)
      .maybeSingle();

    const { data: profileRows } = await supabase
      .from('user_profile')
      .select('first_name, last_name, company_name_short, company_name')
      .eq('company_id', invitation.company_id)
      .limit(1);
    const profile = profileRows?.[0];

    const companyName =
      company?.name ||
      profile?.company_name_short ||
      profile?.company_name ||
      'Votre organisation';

    const inviterName = [profile?.first_name, profile?.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();

    const baseUrl = getAppBaseUrl(request);
    const inviteUrl = `${baseUrl}/auth/accept-invitation?token=${encodeURIComponent(token)}`;

    const roleLabel =
      invitation.role === 'admin' ? 'administrateur' : 'utilisateur';

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data: sendData, error: sendError } = await resend.emails.send({
      from: `${companyName} <contact@gastonstock.com>`,
      to: [invitation.email],
      replyTo: adminRow.email || undefined,
      subject: `Invitation à rejoindre ${companyName} sur Gaston Stock`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 560px;">
          <p style="margin: 0 0 12px 0;">Bonjour,</p>
          <p style="margin: 0 0 12px 0;">
            ${inviterName ? `<strong>${inviterName}</strong> vous invite` : 'Vous êtes invité·e'} à rejoindre
            <strong>${companyName}</strong> sur Gaston Stock en tant que <strong>${roleLabel}</strong>.
          </p>
          <p style="margin: 0 0 16px 0;">
            <a href="${inviteUrl}" style="display: inline-block; background: #0f172a; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600;">Accepter l'invitation</a>
          </p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">
            Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
            <a href="${inviteUrl}" style="color: #2563eb; word-break: break-all;">${inviteUrl}</a>
          </p>
          <p style="margin: 16px 0 0 0; font-size: 13px; color: #64748b;">
            Ce lien expire le ${new Date(invitation.expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.
          </p>
        </div>
      `,
    });

    if (sendError) {
      console.error('Erreur Resend (invitation):', sendError);
      return NextResponse.json(
        { error: sendError.message || 'Erreur lors de l\'envoi de l\'email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: sendData });
  } catch (e) {
    console.error('send-invitation:', e);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de l\'invitation' },
      { status: 500 }
    );
  }
}
