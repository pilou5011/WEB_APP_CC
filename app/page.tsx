import type { Metadata } from 'next';
import LandingClient from './landing/landing-client';
import { LandingJsonLd } from './landing-json-ld';
import { SITE_URL, absoluteUrl } from '@/lib/site-config';

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

export default function HomePage() {
  return (
    <>
      <LandingJsonLd />
      <LandingClient />
    </>
  );
}
