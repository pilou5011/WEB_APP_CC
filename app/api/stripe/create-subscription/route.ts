/**
 * API Route: Création d'un abonnement Stripe
 * POST /api/stripe/create-subscription
 * 
 * Crée un abonnement Stripe pour une entreprise avec le plan et les options choisis
 * Gère les utilisateurs supplémentaires et les périodes de facturation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe, isStripeTestMode } from '@/lib/stripe';
import { 
  CreateSubscriptionPayload, 
  CreateSubscriptionResponse,
  getStripePriceId,
  getExtraUserPriceId
} from '@/types/stripe';

// Initialiser Supabase avec le service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Parser le body
    const body: CreateSubscriptionPayload = await request.json();
    const { 
      company_id, 
      plan_type, 
      billing_cycle, 
      extra_users_count = 0,
      trial_days = 0
    } = body;

    // Validation
    if (!company_id || !plan_type || !billing_cycle) {
      return NextResponse.json(
        { error: 'Paramètres manquants: company_id, plan_type, billing_cycle requis' },
        { status: 400 }
      );
    }

    if (!['standard', 'premium'].includes(plan_type)) {
      return NextResponse.json(
        { error: 'plan_type invalide. Doit être "standard" ou "premium"' },
        { status: 400 }
      );
    }

    if (!['monthly', 'yearly'].includes(billing_cycle)) {
      return NextResponse.json(
        { error: 'billing_cycle invalide. Doit être "monthly" ou "yearly"' },
        { status: 400 }
      );
    }

    if (extra_users_count < 0) {
      return NextResponse.json(
        { error: 'extra_users_count doit être >= 0' },
        { status: 400 }
      );
    }

    // Récupérer la company et vérifier qu'elle a un customer Stripe
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, stripe_customer_id, has_paid_entry_fee, name')
      .eq('id', company_id)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Entreprise non trouvée' },
        { status: 404 }
      );
    }

    if (!company.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Aucun customer Stripe associé. Créez d\'abord un customer.' },
        { status: 400 }
      );
    }

    // ⚠️ RÈGLE CRITIQUE: L'entreprise doit avoir payé les frais d'entrée
    if (!company.has_paid_entry_fee) {
      return NextResponse.json(
        { 
          error: 'Frais d\'activation non payés',
          message: 'L\'entreprise doit d\'abord payer les frais d\'activation initiaux avant de souscrire un abonnement.'
        },
        { status: 403 }
      );
    }

    // Vérifier s'il existe déjà un abonnement actif
    const { data: existingSubscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('company_id', company_id)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    if (existingSubscription) {
      return NextResponse.json(
        { 
          error: 'Abonnement existant',
          message: 'Cette entreprise a déjà un abonnement actif. Utilisez l\'endpoint de mise à jour.'
        },
        { status: 400 }
      );
    }

    // Construire les line items pour Stripe
    const isTest = isStripeTestMode();
    const lineItems: any[] = [];

    // Prix du plan principal
    const mainPriceId = getStripePriceId(plan_type, billing_cycle, isTest);
    lineItems.push({
      price: mainPriceId,
      quantity: 1,
    });

    // Utilisateurs supplémentaires (si applicable)
    if (extra_users_count > 0) {
      const extraUserPriceId = getExtraUserPriceId(billing_cycle, isTest);
      lineItems.push({
        price: extraUserPriceId,
        quantity: extra_users_count,
      });
    }

    console.log(`Création d'un abonnement Stripe pour company ${company_id}...`);
    console.log(`Plan: ${plan_type}, Cycle: ${billing_cycle}, Users extra: ${extra_users_count}`);

    // Créer l'abonnement dans Stripe
    const subscriptionParams: any = {
      customer: company.stripe_customer_id,
      items: lineItems,
      metadata: {
        company_id,
        company_name: company.name,
        plan_type,
        billing_cycle,
        extra_users_count: extra_users_count.toString(),
      },
      payment_behavior: 'default_incomplete',
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    };

    // Ajouter une période d'essai si spécifiée
    if (trial_days > 0) {
      subscriptionParams.trial_period_days = trial_days;
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);

    console.log(`Abonnement Stripe créé: ${subscription.id}`);

    // Déterminer le statut initial
    let initialStatus: 'inactive' | 'trial' | 'active' = 'inactive';
    if (subscription.status === 'trialing') {
      initialStatus = 'trial';
    } else if (subscription.status === 'active') {
      initialStatus = 'active';
    }

    // Créer l'enregistrement dans la table subscriptions
    const { data: newSubscription, error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        company_id,
        stripe_customer_id: company.stripe_customer_id,
        stripe_subscription_id: subscription.id,
        plan_type,
        billing_cycle,
        extra_users_count,
        status: initialStatus,
        activated_at: initialStatus !== 'inactive' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error('Erreur lors de la création de l\'abonnement en DB:', subscriptionError);
      // L'abonnement Stripe existe mais pas en DB - critique
      return NextResponse.json(
        { error: 'Erreur lors de l\'enregistrement de l\'abonnement' },
        { status: 500 }
      );
    }

    // Mettre à jour le statut de la company
    const companyStatus = initialStatus === 'active' || initialStatus === 'trial' ? 'active' : 'pending_payment';
    await supabaseAdmin
      .from('companies')
      .update({ 
        subscription_status: companyStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', company_id);

    console.log(`Abonnement créé avec succès pour company ${company_id}`);

    // Extraire le client_secret pour le paiement (si nécessaire)
    let clientSecret: string | null = null;
    if (subscription.latest_invoice && typeof subscription.latest_invoice === 'object') {
      const invoice = subscription.latest_invoice as any;
      if (invoice.payment_intent && typeof invoice.payment_intent === 'object') {
        clientSecret = invoice.payment_intent.client_secret;
      }
    }

    const response: CreateSubscriptionResponse = {
      subscription_id: subscription.id,
      client_secret: clientSecret,
      status: initialStatus,
      current_period_end: subscription.current_period_end,
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Erreur lors de la création de l\'abonnement:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la création de l\'abonnement',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

