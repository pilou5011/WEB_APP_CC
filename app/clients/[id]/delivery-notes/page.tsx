'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { currentUserCanAccessFeature } from '@/lib/auth-helpers';
import { FEATURES } from '@/lib/subscription';
import { DeliveryNotesClientPage } from '@/components/delivery-notes/delivery-notes-client-page';
import { DeliveryNotesGoldUpgradePage } from '@/components/delivery-notes/gold-upgrade-page';
import { supabase } from '@/lib/supabase';

export default function ClientDeliveryNotesPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [clientName, setClientName] = useState<string | undefined>();

  useEffect(() => {
    const check = async () => {
      try {
        const access = await currentUserCanAccessFeature(FEATURES.DELIVERY_NOTES);
        setHasAccess(access);

        const { data } = await supabase.from('clients').select('name').eq('id', clientId).maybeSingle();
        setClientName(data?.name);
      } finally {
        setLoading(false);
      }
    };
    void check();
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!hasAccess) {
    return <DeliveryNotesGoldUpgradePage clientName={clientName} />;
  }

  return <DeliveryNotesClientPage clientId={clientId} />;
}
