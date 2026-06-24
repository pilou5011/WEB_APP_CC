import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type LoginAsUserPayload = {
  targetEmail?: string;
  targetUserId?: string;
};

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim();
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const superAdminEmail = (process.env.ADMIN_IMPERSONATION_EMAIL || 'chevallierpierrelouis@gmail.com').toLowerCase();

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Configuration serveur manquante' },
        { status: 500 }
      );
    }

    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      data: { user: currentUser },
      error: currentUserError,
    } = await authClient.auth.getUser(token);

    if (currentUserError || !currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentUserAppRow, error: currentUserAppError } = await adminClient
      .from('users')
      .select('id, email, role, company_id')
      .eq('id', currentUser.id)
      .single();

    if (currentUserAppError || !currentUserAppRow) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (currentUserAppRow.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if ((currentUser.email || '').toLowerCase() !== superAdminEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as LoginAsUserPayload;
    const targetEmailFromBody = body.targetEmail?.trim().toLowerCase();
    const targetUserId = body.targetUserId?.trim();

    if (!targetEmailFromBody && !targetUserId) {
      return NextResponse.json(
        { error: 'targetEmail ou targetUserId requis' },
        { status: 400 }
      );
    }

    let targetEmail: string | undefined = targetEmailFromBody;

    if (targetUserId) {
      const { data: targetUserRow, error: targetUserRowError } = await adminClient
        .from('users')
        .select('id, email, company_id')
        .eq('id', targetUserId)
        .single();

      if (targetUserRowError || !targetUserRow) {
        return NextResponse.json({ error: 'Utilisateur cible introuvable' }, { status: 404 });
      }

      targetEmail = targetEmail || (targetUserRow.email || '').toLowerCase() || undefined;
    }

    if (!targetEmail) {
      return NextResponse.json({ error: 'Email cible invalide' }, { status: 400 });
    }

    const { data: targetUserByEmail, error: targetByEmailError } = await adminClient
      .from('users')
      .select('id, email, company_id')
      .eq('email', targetEmail)
      .single();

    if (targetByEmailError || !targetUserByEmail) {
      return NextResponse.json({ error: 'Utilisateur cible introuvable' }, { status: 404 });
    }

    const currentEmail = (currentUser.email || '').toLowerCase();

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: targetEmail,
    });

    const tokenHash = linkData?.properties?.hashed_token;
    if (linkError || !tokenHash) {
      return NextResponse.json(
        { error: linkError?.message || 'Impossible de générer le token de connexion' },
        { status: 500 }
      );
    }

    const { data: verifyData, error: verifyError } = await authClient.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'magiclink',
    });

    let targetSession = verifyData?.session ?? null;

    if (verifyError || !targetSession) {
      const { data: fallbackVerify, error: fallbackError } = await authClient.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'email',
      });

      if (fallbackError || !fallbackVerify.session) {
        return NextResponse.json(
          {
            error:
              fallbackError?.message ||
              verifyError?.message ||
              'Impossible de créer la session utilisateur',
          },
          { status: 500 }
        );
      }

      targetSession = fallbackVerify.session;
    }

    return NextResponse.json({
      session: {
        access_token: targetSession.access_token,
        refresh_token: targetSession.refresh_token,
      },
      adminEmail: currentEmail,
      targetUserId: targetUserByEmail.id,
      redirectTo: `/app?${new URLSearchParams({
        impersonation: '1',
        admin_email: currentEmail,
      }).toString()}`,
    });
  } catch (error) {
    console.error('login-as-user error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
