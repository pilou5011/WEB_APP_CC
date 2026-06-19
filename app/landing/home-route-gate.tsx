'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import LandingClient from './landing-client';
import { LandingJsonLd } from '../landing-json-ld';
import {
  hasLegacySupabaseAuthStorage,
  setKnownAccountCookieClient,
} from '@/lib/supabase/auth-routing';

type HomePhase = 'checking' | 'landing';

export default function HomeRouteGate() {
  const [phase, setPhase] = useState<HomePhase>('checking');

  useEffect(() => {
    if (hasLegacySupabaseAuthStorage()) {
      setKnownAccountCookieClient();
      window.location.replace('/auth');
      return;
    }

    setPhase('landing');
  }, []);

  if (phase === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden="true" />
        <span className="sr-only">Chargement…</span>
      </div>
    );
  }

  return (
    <>
      <LandingJsonLd />
      <LandingClient />
    </>
  );
}
