import { FEATURE_MIN_PLAN, type Feature } from './features';
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from './types';
import { DEFAULT_SUBSCRIPTION_PLAN } from './plans';

const PLAN_RANK: Record<SubscriptionPlan, number> = {
  standard: 0,
  gold: 1,
};

export function isSubscriptionPlan(value: unknown): value is SubscriptionPlan {
  return typeof value === 'string' && (SUBSCRIPTION_PLANS as readonly string[]).includes(value);
}

export function normalizeSubscriptionPlan(value: unknown): SubscriptionPlan {
  return isSubscriptionPlan(value) ? value : DEFAULT_SUBSCRIPTION_PLAN;
}

export function hasFeature(plan: SubscriptionPlan, feature: Feature): boolean {
  const minPlan = FEATURE_MIN_PLAN[feature];
  return PLAN_RANK[plan] >= PLAN_RANK[minPlan];
}

export function canAccessFeature(plan: SubscriptionPlan, feature: Feature): boolean {
  return hasFeature(plan, feature);
}

export function getFeaturesForPlan(plan: SubscriptionPlan): Feature[] {
  return (Object.keys(FEATURE_MIN_PLAN) as Feature[]).filter((feature) =>
    hasFeature(plan, feature)
  );
}
