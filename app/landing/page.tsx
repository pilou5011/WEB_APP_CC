import type { Metadata } from 'next';
import LandingClient from './landing-client';

export const metadata: Metadata = {
  title: 'Gaston Stock | Logiciel de dépôt-vente',
  description:
    'Gaston Stock, solution SaaS pour les professionnels du dépôt-vente : gestion des dépôts, suivi des ventes, commissions et facturation conforme.',
};

export default function LandingPage() {
  return <LandingClient />;
}
