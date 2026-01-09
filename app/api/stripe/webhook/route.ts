/**
 * API Route: Webhooks Stripe
 * POST /api/stripe/webhook
 * 
 * ⚠️ ROUTE CRITIQUE - Gère tous les événements Stripe
 * Cette route synchronise automatiquement l'état des abonnements
 * et suspend/réactive les accès selon les paiements
 * 
 * Événements gérés:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe, getStripeWebhookSecret, mapStripeStatusToAppStatus } from '@/lib/stripe';
import Stripe from 'stripe';

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

/**
 * Configuration Next.js pour désactiver le parsing du body
 * Nécessaire pour vérifier la signature Stripe
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Vérifier si un événement a déjà été traité (idempotence)
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('stripe_events')
    .select('id')
    .eq('stripe_event_id', eventId)
    .maybeSingle();
  
  return !!data;
}

/**
 * Marquer un événement comme traité
 */
async function markEventProcessed(event: Stripe.Event): Promise<void> {
  await supabaseAdmin
    .from('stripe_events')
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event as any,
    });
}

/**
 * Gérer la création/mise à jour d'un abonnement
 */
async function handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void> {
  const companyId = subscription.metadata.company_id;
  
  if (!companyId) {
    console.error('Abonnement sans company_id dans metadata:', subscription.id);
    return;
  }

  console.log(`Traitement de l'abonnement ${subscription.id} pour company ${companyId}`);
  console.log(`Statut Stripe: ${subscription.status}`);

  // Mapper le statut Stripe vers le statut DB
  let dbStatus: 'inactive' | 'trial' | 'active' | 'past_due' | 'canceled' = 'inactive';
  
  switch (subscription.status) {
    case 'active':
      dbStatus = 'active';
      break;
    case 'trialing':
      dbStatus = 'trial';
      break;
    case 'past_due':
      dbStatus = 'past_due';
      break;
    case 'canceled':
    case 'unpaid':
      dbStatus = 'canceled';
      break;
    default:
      dbStatus = 'inactive';
  }

  // Déterminer le statut de la company (accès autorisé ou non)
  const companyStatus = mapStripeStatusToAppStatus(subscription.status);
  
  console.log(`DB Status: ${dbStatus}, Company Status: ${companyStatus}`);

  // Compter les utilisateurs supplémentaires
  let extraUsersCount = 0;
  for (const item of subscription.items.data) {
    const priceId = item.price.id;
    // Identifier les prix d'utilisateurs supplémentaires
    if (priceId.includes('extra_user') || 
        priceId === process.env.STRIPE_PRICE_EXTRA_USER_MONTHLY_TEST ||
        priceId === process.env.STRIPE_PRICE_EXTRA_USER_YEARLY_TEST ||
        priceId === process.env.STRIPE_PRICE_EXTRA_USER_MONTHLY_LIVE ||
        priceId === process.env.STRIPE_PRICE_EXTRA_USER_YEARLY_LIVE) {
      extraUsersCount = item.quantity || 0;
    }
  }

  // Mettre à jour ou créer l'abonnement en DB
  const { data: existingSubscription } = await supabaseAdmin
    .from('subscriptions')
    .select('id')
    .eq('company_id', companyId)
    .maybeSingle();

  if (existingSubscription) {
    // Mise à jour
    const updateData: any = {
      stripe_subscription_id: subscription.id,
      extra_users_count: extraUsersCount,
      status: dbStatus,
      updated_at: new Date().toISOString(),
    };

    // Mettre activated_at uniquement si on passe à active/trial pour la première fois
    if ((dbStatus === 'active' || dbStatus === 'trial')) {
      const { data: current } = await supabaseAdmin
        .from('subscriptions')
        .select('activated_at')
        .eq('id', existingSubscription.id)
        .single();
      
      if (!current?.activated_at) {
        updateData.activated_at = new Date().toISOString();
      }
    }

    await supabaseAdmin
      .from('subscriptions')
      .update(updateData)
      .eq('id', existingSubscription.id);

    console.log(`Abonnement ${existingSubscription.id} mis à jour`);
  } else {
    // Création (normalement déjà fait par create-subscription, mais au cas où)
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('stripe_customer_id')
      .eq('id', companyId)
      .single();

    if (company) {
      await supabaseAdmin
        .from('subscriptions')
        .insert({
          company_id: companyId,
          stripe_customer_id: company.stripe_customer_id,
          stripe_subscription_id: subscription.id,
          plan_type: subscription.metadata.plan_type || 'standard',
          billing_cycle: subscription.metadata.billing_cycle || 'monthly',
          extra_users_count: extraUsersCount,
          status: dbStatus,
          activated_at: (dbStatus === 'active' || dbStatus === 'trial') ? new Date().toISOString() : null,
        });

      console.log(`Nouvel abonnement créé pour company ${companyId}`);
    }
  }

  // ⚠️ CRITIQUE: Mettre à jour le statut de la company pour bloquer/débloquer l'accès
  await supabaseAdmin
    .from('companies')
    .update({ 
      subscription_status: companyStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', companyId);

  console.log(`Company ${companyId} - subscription_status mis à jour: ${companyStatus}`);
}

/**
 * Gérer la suppression d'un abonnement
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const companyId = subscription.metadata.company_id;
  
  if (!companyId) {
    console.error('Abonnement supprimé sans company_id:', subscription.id);
    return;
  }

  console.log(`Suppression de l'abonnement ${subscription.id} pour company ${companyId}`);

  // Mettre à jour l'abonnement en DB
  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  // ⚠️ CRITIQUE: Suspendre l'accès à l'application
  await supabaseAdmin
    .from('companies')
    .update({ 
      subscription_status: 'suspended',
      updated_at: new Date().toISOString()
    })
    .eq('id', companyId);

  console.log(`Company ${companyId} - accès suspendu suite à annulation d'abonnement`);
}

/**
 * Gérer le succès d'un paiement
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  if (!invoice.subscription) {
    // Paiement non lié à un abonnement (one-time payment)
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
  
  console.log(`Paiement réussi pour abonnement ${subscription.id}`);
  
  // Réactiver l'abonnement si nécessaire
  await handleSubscriptionChange(subscription);
}

/**
 * Gérer l'échec d'un paiement
 */
async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  if (!invoice.subscription) {
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
  const companyId = subscription.metadata.company_id;
  
  if (!companyId) {
    console.error('Paiement échoué pour abonnement sans company_id:', subscription.id);
    return;
  }

  console.log(`⚠️ Paiement échoué pour abonnement ${subscription.id}, company ${companyId}`);

  // ⚠️ CRITIQUE: Suspendre l'accès immédiatement
  await supabaseAdmin
    .from('companies')
    .update({ 
      subscription_status: 'suspended',
      updated_at: new Date().toISOString()
    })
    .eq('id', companyId);

  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  console.log(`Company ${companyId} - accès suspendu suite à échec de paiement`);

  // TODO: Envoyer un email de notification à l'admin de la company
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('Webhook sans signature Stripe');
      return NextResponse.json(
        { error: 'Signature manquante' },
        { status: 400 }
      );
    }

    // Vérifier la signature du webhook
    let event: Stripe.Event;
    try {
      const webhookSecret = getStripeWebhookSecret();
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Erreur de vérification de signature webhook:', err.message);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    console.log(`📨 Webhook reçu: ${event.type} (${event.id})`);

    // Vérifier l'idempotence (éviter de traiter deux fois le même événement)
    if (await isEventProcessed(event.id)) {
      console.log(`Événement ${event.id} déjà traité, skip`);
      return NextResponse.json({ received: true, skipped: true });
    }

    // Traiter l'événement selon son type
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.trial_will_end':
        // TODO: Envoyer un email de rappel
        console.log('Fin de période d\'essai imminente:', event.data.object);
        break;

      default:
        console.log(`Type d'événement non géré: ${event.type}`);
    }

    // Marquer l'événement comme traité
    await markEventProcessed(event);

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Erreur lors du traitement du webhook:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur serveur lors du traitement du webhook',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

