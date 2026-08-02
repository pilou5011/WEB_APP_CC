import './globals.css';
import '@fontsource-variable/inter/wght.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
import { LayoutWrapper } from '@/components/layout-wrapper';
import { SITE_URL, absoluteUrl } from '@/lib/site-config';

const bodyStyle = {
  fontFamily: "'Inter Variable', Inter, system-ui, sans-serif",
  ['--font-poppins' as string]: "'Poppins', system-ui, sans-serif",
} as CSSProperties;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Gaston Stock | Logiciel de dépôt-vente',
    template: '%s | Gaston Stock',
  },
  description:
    'Gaston Stock, solution SaaS pour les professionnels du dépôt-vente : gestion des dépôts, suivi des ventes, commissions et facturation conforme.',
  icons: {
    icon: '/logo_onglet_internet.png',
    shortcut: '/logo_onglet_internet.png',
    apple: '/logo_onglet_internet.png',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Gaston Stock',
    images: [
      {
        url: absoluteUrl('/og-gaston-stock.jpg'),
        width: 1200,
        height: 630,
        alt: 'Gaston Stock — logiciel dépôt-vente',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Logiciel dépôt-vente | Gestion & facturation | Gaston Stock',
    description:
      'Gestion dépôt-vente, facturation conforme et facturation électronique. Devis personnalisé — Gaston Stock.',
    images: [absoluteUrl('/og-gaston-stock.jpg')],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased" style={bodyStyle}>
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
        <Toaster />
      </body>
    </html>
  );
}
