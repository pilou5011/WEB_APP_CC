'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { currentUserCanAccessFeature } from '@/lib/auth-helpers';
import { FEATURES } from '@/lib/subscription';
import { PaiementsGoldUpgradePage } from '@/components/paiements/gold-upgrade-page';
import { PaymentsClientPage } from '@/components/paiements/payments-page';

export default function PaiementsPage() {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const access = await currentUserCanAccessFeature(FEATURES.PAYMENTS);
        setHasAccess(access);
      } finally {
        setLoading(false);
      }
    };
    void check();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!hasAccess) {
    return <PaiementsGoldUpgradePage />;
  }

  return <PaymentsClientPage />;
}
