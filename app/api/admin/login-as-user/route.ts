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

function buildRedirectTo(request: NextRequest, adminEmail: string): string {
  const origin = request.nextUrl.origin;
  const params = new URLSearchParams({
    impersonation: '1',
    admin_email: adminEmail,
  });
  return `${origin}/?${params.toString()}`;
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

    let targetUserEmailFromTable: string | null = null;
    if (targetUserId) {
      const { data: targetUserRow, error: targetUserRowError } = await adminClient
        .from('users')
        .select('id, email, company_id')
        .eq('id', targetUserId)
        .single();

      if (targetUserRowError || !targetUserRow) {
        return NextResponse.json({ error: 'Utilisateur cible introuvable' }, { status: 404 });
      }

      targetUserEmailFromTable = (targetUserRow.email || '').toLowerCase();
      targetEmail = targetEmail || targetUserEmailFromTable || undefined;
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
    const redirectTo = buildRedirectTo(request, currentEmail);

    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: targetEmail,
      options: {
        redirectTo,
      },
    });

    if (error || !data.properties?.action_link) {
      return NextResponse.json(
        { error: error?.message || 'Impossible de générer le magic link' },
        { status: 500 }
      );
    }

    return NextResponse.json({ link: data.properties.action_link });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
