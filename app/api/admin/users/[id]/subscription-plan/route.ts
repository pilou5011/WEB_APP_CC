import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isSubscriptionPlan } from '@/lib/subscription';

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim();
}

async function assertSuperAdmin(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const superAdminEmail = (process.env.ADMIN_IMPERSONATION_EMAIL || 'chevallierpierrelouis@gmail.com').toLowerCase();

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return { error: NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 }) };
  }

  const token = getBearerToken(request);
  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
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
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: currentUserRow, error: currentUserRowError } = await adminClient
    .from('users')
    .select('id, email, role')
    .eq('id', currentUser.id)
    .single();

  if (currentUserRowError || !currentUserRow || currentUserRow.role !== 'super_admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  const isExpectedSuperAdminEmail = (currentUser.email || '').toLowerCase() === superAdminEmail;
  if (!isExpectedSuperAdminEmail) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { adminClient };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await assertSuperAdmin(request);
    if ('error' in authResult && authResult.error) {
      return authResult.error;
    }

    const { adminClient } = authResult;
    const userId = params.id?.trim();
    if (!userId) {
      return NextResponse.json({ error: 'Identifiant utilisateur requis' }, { status: 400 });
    }

    const body = (await request.json()) as { subscription_plan?: unknown };
    const subscriptionPlan = body.subscription_plan;

    if (!isSubscriptionPlan(subscriptionPlan)) {
      return NextResponse.json(
        { error: 'subscription_plan invalide (standard | gold)' },
        { status: 400 }
      );
    }

    const { data: updatedUser, error: updateError } = await adminClient!
      .from('users')
      .update({ subscription_plan: subscriptionPlan })
      .eq('id', userId)
      .select('id, email, subscription_plan, role, company_id, created_at')
      .single();

    if (updateError || !updatedUser) {
      return NextResponse.json(
        { error: updateError?.message || 'Utilisateur introuvable' },
        { status: updateError?.code === 'PGRST116' ? 404 : 500 }
      );
    }

    return NextResponse.json({ user: updatedUser });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
