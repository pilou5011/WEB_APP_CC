import './globals.css';
import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { LayoutWrapper } from '@/components/layout-wrapper';

const inter = Inter({ subsets: ['latin'] });
const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-poppins'
});

export const metadata: Metadata = {
  title: 'Gaston Stock',
  description: 'Application de gestion dépôts-ventes',
  icons: {
    icon: '/logo_onglet_internet.png',
    shortcut: '/logo_onglet_internet.png',
    apple: '/logo_onglet_internet.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={`${inter.className} ${poppins.variable}`}>
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
        <Toaster />
      </body>
    </html>
  );
}
