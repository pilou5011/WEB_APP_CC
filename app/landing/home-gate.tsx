'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import LandingClient from './landing-client';

export default function HomeGate() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.replace('/app');
        return;
      }

      setCheckingSession(false);
    };

    checkSession();
  }, [router]);

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-slate-500 animate-pulse">Chargement...</div>
      </div>
    );
  }

  return <LandingClient />;
}

