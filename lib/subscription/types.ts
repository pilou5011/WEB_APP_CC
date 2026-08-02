export const SUBSCRIPTION_PLANS = ['standard', 'gold'] as const;

export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];
