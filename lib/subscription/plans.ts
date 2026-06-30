import type { SubscriptionPlan } from './types';

export const DEFAULT_SUBSCRIPTION_PLAN: SubscriptionPlan = 'standard';

export const SUBSCRIPTION_PLAN_LABELS: Record<SubscriptionPlan, string> = {
  standard: 'Formule Standard',
  gold: 'Formule Gold',
};

export const SUBSCRIPTION_PLAN_DESCRIPTIONS: Record<SubscriptionPlan, string> = {
  standard: 'Toutes les fonctionnalités actuellement disponibles.',
  gold: 'Toutes les fonctionnalités Standard, plus des fonctionnalités premium à venir.',
};
