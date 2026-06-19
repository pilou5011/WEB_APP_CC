import type { Metadata } from 'next';
import Script from 'next/script';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { SITE_URL, absoluteUrl } from '@/lib/site-config';
import { createClient } from '@/lib/supabase/server';
import { shouldRedirectHomeToAuth, homeKnownAccountRedirectScript } from '@/lib/supabase/auth-routing';
import HomeRouteGate from './landing/home-route-gate';

const homeDescription =
  'Dépôts, relevés, commissions : gestion dépôt-vente et facturation conforme. Anticipez la facturation électronique. Gagnez du temps — devis sur mesure avec Gaston Stock.';

export const metadata: Metadata = {
  title: {
    absolute: 'Logiciel dépôt-vente | Gestion & facturation | Gaston Stock',
  },
  description: homeDescription,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    url: SITE_URL,
    title: 'Logiciel dépôt-vente | Gestion & facturation | Gaston Stock',
    description: homeDescription,
    images: [absoluteUrl('/og-gaston-stock.jpg')],
  },
};

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/app');
  }

  if (shouldRedirectHomeToAuth(cookies().getAll())) {
    redirect('/auth');
  }

  return (
    <>
      <Script id="home-known-account-redirect" strategy="beforeInteractive">
        {homeKnownAccountRedirectScript}
      </Script>
      <HomeRouteGate />
    </>
  );
}
