import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import {
  createSupabaseClientWithToken,
  getBearerToken,
} from '@/lib/api-helpers';
import { FEATURES, hasFeature, normalizeSubscriptionPlan } from '@/lib/subscription';
import type { NextRequest } from 'next/server';

export type PaymentsAuthContext = {
  supabase: SupabaseClient;
  userId: string;
  companyId: string;
};

/**
 * Auth + Gold pour les routes /api/payments/*.
 * company_id issu de la table users (jamais du body client).
 */
export async function requirePaymentsApiAccess(
  request: NextRequest
): Promise<PaymentsAuthContext | NextResponse> {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const supabase = createSupabaseClientWithToken(token);
  if (!supabase) {
    return NextResponse.json(
      { error: 'Configuration serveur manquante' },
      { status: 500 }
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('id, company_id, subscription_plan')
    .eq('id', user.id)
    .single();

  if (userError || !userRow?.company_id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const plan = normalizeSubscriptionPlan(userRow.subscription_plan);
  if (!hasFeature(plan, FEATURES.PAYMENTS)) {
    return NextResponse.json(
      { error: 'Fonctionnalité réservée à la formule Gold' },
      { status: 403 }
    );
  }

  return {
    supabase,
    userId: userRow.id,
    companyId: userRow.company_id,
  };
}
