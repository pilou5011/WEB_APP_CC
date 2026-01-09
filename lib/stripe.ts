/**
 * Configuration et initialisation de Stripe
 * Gère les environnements test/production de manière sécurisée
 */

import Stripe from 'stripe';

// Vérification de la configuration
if (!process.env.STRIPE_SECRET_KEY_TEST || !process.env.STRIPE_SECRET_KEY_LIVE) {
  console.warn('⚠️ Warning: Stripe secret keys not configured. Please add STRIPE_SECRET_KEY_TEST and STRIPE_SECRET_KEY_LIVE to your environment variables.');
}

/**
 * Détermine si on est en mode test ou production
 * Par défaut en mode test pour éviter les erreurs
 */
export const isStripeTestMode = (): boolean => {
  const mode = process.env.STRIPE_MODE || 'test';
  return mode === 'test';
};

/**
 * Obtient la clé secrète Stripe appropriée selon l'environnement
 */
const getStripeSecretKey = (): string => {
  const isTest = isStripeTestMode();
  const key = isTest 
    ? process.env.STRIPE_SECRET_KEY_TEST 
    : process.env.STRIPE_SECRET_KEY_LIVE;
  
  if (!key) {
    throw new Error(
      `Missing Stripe secret key for ${isTest ? 'test' : 'live'} mode. ` +
      `Please set STRIPE_SECRET_KEY_${isTest ? 'TEST' : 'LIVE'} in your environment variables.`
    );
  }
  
  return key;
};

/**
 * Obtient la clé publique Stripe appropriée selon l'environnement
 */
export const getStripePublishableKey = (): string => {
  const isTest = isStripeTestMode();
  const key = isTest 
    ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST 
    : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE;
  
  if (!key) {
    throw new Error(
      `Missing Stripe publishable key for ${isTest ? 'test' : 'live'} mode. ` +
      `Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_${isTest ? 'TEST' : 'LIVE'} in your environment variables.`
    );
  }
  
  return key;
};

/**
 * Obtient le webhook secret approprié selon l'environnement
 */
export const getStripeWebhookSecret = (): string => {
  const isTest = isStripeTestMode();
  const secret = isTest 
    ? process.env.STRIPE_WEBHOOK_SECRET_TEST 
    : process.env.STRIPE_WEBHOOK_SECRET_LIVE;
  
  if (!secret) {
    throw new Error(
      `Missing Stripe webhook secret for ${isTest ? 'test' : 'live'} mode. ` +
      `Please set STRIPE_WEBHOOK_SECRET_${isTest ? 'TEST' : 'LIVE'} in your environment variables.`
    );
  }
  
  return secret;
};

/**
 * Instance Stripe configurée selon l'environnement
 * Cette instance est utilisée pour tous les appels serveur Stripe
 */
export const stripe = new Stripe(getStripeSecretKey(), {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
  appInfo: {
    name: 'Cartes Voeux App',
    version: '1.0.0',
  },
});

/**
 * Log de l'environnement Stripe au démarrage (utile pour le debug)
 */
if (process.env.NODE_ENV === 'development') {
  console.log(`🔧 Stripe initialized in ${isStripeTestMode() ? 'TEST' : 'LIVE'} mode`);
}

/**
 * Helper pour vérifier si un customer Stripe existe
 */
export async function verifyStripeCustomer(customerId: string): Promise<boolean> {
  try {
    await stripe.customers.retrieve(customerId);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Helper pour vérifier si un abonnement Stripe existe
 */
export async function verifyStripeSubscription(subscriptionId: string): Promise<boolean> {
  try {
    await stripe.subscriptions.retrieve(subscriptionId);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Helper pour convertir un statut Stripe en statut application
 */
export function mapStripeStatusToAppStatus(
  stripeStatus: Stripe.Subscription.Status
): 'active' | 'suspended' {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
    case 'canceled':
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
    default:
      return 'suspended';
  }
}

/**
 * Helper pour récupérer les détails d'un abonnement Stripe
 */
export async function getSubscriptionDetails(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice', 'customer']
    });
    return subscription;
  } catch (error) {
    console.error('Error fetching subscription details:', error);
    throw error;
  }
}

/**
 * Helper pour récupérer les factures d'un customer
 */
export async function getCustomerInvoices(customerId: string, limit: number = 10) {
  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
    });
    return invoices.data;
  } catch (error) {
    console.error('Error fetching customer invoices:', error);
    throw error;
  }
}

/**
 * Helper pour créer un portal de gestion client Stripe
 * Permet au client de gérer son abonnement, ses moyens de paiement, etc.
 */
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return session.url;
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    throw error;
  }
}

/**
 * Helper pour créer une session de paiement Checkout
 */
export async function createCheckoutSession(params: {
  customerId: string;
  priceId: string;
  quantity?: number;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Checkout.Session> {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: params.customerId,
      mode: 'subscription',
      line_items: [
        {
          price: params.priceId,
          quantity: params.quantity || 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
      subscription_data: {
        metadata: params.metadata,
      },
    });
    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

export default stripe;

