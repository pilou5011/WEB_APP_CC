'use client';

import { useCallback, useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/auth-helpers';
import {
  canAccessFeature,
  normalizeSubscriptionPlan,
  type Feature,
  type SubscriptionPlan,
} from '@/lib/subscription';

type UseSubscriptionResult = {
  plan: SubscriptionPlan | null;
  loading: boolean;
  hasFeature: (feature: Feature) => boolean;
  canAccessFeature: (feature: Feature) => boolean;
};

/**
 * Hook client pour vérifier la formule et les droits d'accès aux fonctionnalités.
 * Réutilise getCurrentUser() : aucune requête Supabase supplémentaire.
 */
export function useSubscription(): UseSubscriptionResult {
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadPlan = async () => {
      const user = await getCurrentUser();
      if (cancelled) return;
      setPlan(user ? normalizeSubscriptionPlan(user.subscription_plan) : null);
      setLoading(false);
    };

    void loadPlan();

    return () => {
      cancelled = true;
    };
  }, []);

  const checkFeature = useCallback(
    (feature: Feature) => {
      if (!plan) return false;
      return canAccessFeature(plan, feature);
    },
    [plan]
  );

  return {
    plan,
    loading,
    hasFeature: checkFeature,
    canAccessFeature: checkFeature,
  };
}
