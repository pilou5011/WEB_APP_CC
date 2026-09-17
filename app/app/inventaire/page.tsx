'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { currentUserCanAccessFeature } from '@/lib/auth-helpers';
import { FEATURES } from '@/lib/subscription';
import { InventaireClientPage } from '@/components/inventaire/inventaire-page';
import { InventaireGoldUpgradePage } from '@/components/inventaire/gold-upgrade-page';

export default function InventairePage() {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const access = await currentUserCanAccessFeature(FEATURES.INVENTORY);
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
    return <InventaireGoldUpgradePage />;
  }

  return <InventaireClientPage />;
}
