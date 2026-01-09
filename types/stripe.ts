/**
 * Types TypeScript pour l'intégration Stripe
 * Définit les structures de données pour les abonnements et la gestion des paiements
 */

// Types de plans disponibles
export type PlanType = 'standard' | 'premium';

// Cycles de facturation
export type BillingCycle = 'monthly' | 'yearly';

// Statuts d'abonnement (alignés avec Stripe)
export type SubscriptionStatus = 
  | 'inactive'      // Pas encore d'abonnement actif
  | 'trial'         // En période d'essai
  | 'active'        // Abonnement actif et payé
  | 'past_due'      // Paiement en retard
  | 'canceled';     // Abonnement annulé

// Statuts d'accès à l'application
export type CompanySubscriptionStatus = 
  | 'pending_payment'  // En attente du paiement initial
  | 'active'           // Accès total autorisé
  | 'suspended';       // Accès suspendu (non-paiement, annulation)

/**
 * Interface pour la table subscriptions
 */
export interface Subscription {
  id: string;
  company_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  plan_type: PlanType;
  billing_cycle: BillingCycle;
  extra_users_count: number;
  status: SubscriptionStatus;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Interface pour les extensions de la table companies
 */
export interface CompanyStripeData {
  stripe_customer_id: string | null;
  subscription_status: CompanySubscriptionStatus;
  has_paid_entry_fee: boolean;
}

/**
 * Interface pour les événements Stripe (table stripe_events)
 */
export interface StripeEvent {
  id: string;
  stripe_event_id: string;
  event_type: string;
  processed_at: string;
  payload: any;
  created_at: string;
}

/**
 * Payload pour la création d'un customer Stripe
 */
export interface CreateCustomerPayload {
  company_id: string;
  email: string;
  name: string;
  metadata?: Record<string, string>;
}

/**
 * Payload pour la création d'un abonnement
 */
export interface CreateSubscriptionPayload {
  company_id: string;
  plan_type: PlanType;
  billing_cycle: BillingCycle;
  extra_users_count?: number;
  trial_days?: number;
}

/**
 * Réponse de la création d'un abonnement
 */
export interface CreateSubscriptionResponse {
  subscription_id: string;
  client_secret: string | null;
  status: SubscriptionStatus;
  current_period_end: number;
}

/**
 * Payload pour la mise à jour d'un abonnement
 */
export interface UpdateSubscriptionPayload {
  company_id: string;
  plan_type?: PlanType;
  billing_cycle?: BillingCycle;
  extra_users_count?: number;
}

/**
 * Configuration des prix Stripe selon l'environnement
 */
export interface StripePriceConfig {
  standard_monthly: string;
  standard_yearly: string;
  premium_monthly: string;
  premium_yearly: string;
  extra_user_monthly: string;
  extra_user_yearly: string;
}

/**
 * Détails d'un abonnement pour l'affichage
 */
export interface SubscriptionDetails {
  id: string;
  plan_type: PlanType;
  plan_name: string;
  billing_cycle: BillingCycle;
  billing_cycle_label: string;
  extra_users_count: number;
  status: SubscriptionStatus;
  status_label: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  amount: number;
  currency: string;
}

/**
 * Limites d'utilisation selon le plan
 */
export interface PlanLimits {
  max_users: number;              // Nombre d'utilisateurs inclus dans le plan de base
  max_clients: number | null;     // null = illimité
  max_products: number | null;    // null = illimité
  features: string[];             // Liste des fonctionnalités disponibles
}

/**
 * Configuration complète des plans
 */
export const PLAN_CONFIGS: Record<PlanType, PlanLimits> = {
  standard: {
    max_users: 1,
    max_clients: null,
    max_products: null,
    features: [
      'Gestion des clients',
      'Gestion des produits',
      'Facturation',
      'Bons de dépôt',
      'Avoirs',
      'Support email'
    ]
  },
  premium: {
    max_users: 3,
    max_clients: null,
    max_products: null,
    features: [
      'Toutes les fonctionnalités Standard',
      'Utilisateurs multiples inclus',
      'Statistiques avancées',
      'Export de données',
      'Support prioritaire',
      'Intégration API'
    ]
  }
};

/**
 * Helper pour obtenir le prix ID selon le plan et le cycle
 */
export function getStripePriceId(
  planType: PlanType,
  billingCycle: BillingCycle,
  isTest: boolean
): string {
  const env = isTest ? 'TEST' : 'LIVE';
  const key = `STRIPE_PRICE_${planType.toUpperCase()}_${billingCycle.toUpperCase()}_${env}`;
  
  const priceId = process.env[key];
  if (!priceId) {
    throw new Error(`Missing Stripe price ID: ${key}`);
  }
  
  return priceId;
}

/**
 * Helper pour obtenir le prix ID des utilisateurs supplémentaires
 */
export function getExtraUserPriceId(
  billingCycle: BillingCycle,
  isTest: boolean
): string {
  const env = isTest ? 'TEST' : 'LIVE';
  const key = `STRIPE_PRICE_EXTRA_USER_${billingCycle.toUpperCase()}_${env}`;
  
  const priceId = process.env[key];
  if (!priceId) {
    throw new Error(`Missing Stripe extra user price ID: ${key}`);
  }
  
  return priceId;
}

/**
 * Helper pour vérifier si une entreprise a un accès valide
 */
export function hasValidAccess(company: CompanyStripeData): boolean {
  return company.has_paid_entry_fee && company.subscription_status === 'active';
}

/**
 * Helper pour obtenir le label d'un statut d'abonnement
 */
export function getSubscriptionStatusLabel(status: SubscriptionStatus): string {
  const labels: Record<SubscriptionStatus, string> = {
    inactive: 'Inactif',
    trial: 'Période d\'essai',
    active: 'Actif',
    past_due: 'Paiement en retard',
    canceled: 'Annulé'
  };
  return labels[status] || status;
}

/**
 * Helper pour obtenir le label d'un plan
 */
export function getPlanLabel(planType: PlanType): string {
  const labels: Record<PlanType, string> = {
    standard: 'Standard',
    premium: 'Premium'
  };
  return labels[planType] || planType;
}

/**
 * Helper pour obtenir le label d'un cycle de facturation
 */
export function getBillingCycleLabel(billingCycle: BillingCycle): string {
  const labels: Record<BillingCycle, string> = {
    monthly: 'Mensuel',
    yearly: 'Annuel'
  };
  return labels[billingCycle] || billingCycle;
}

