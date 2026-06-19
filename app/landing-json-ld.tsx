import { SITE_URL, absoluteUrl } from '@/lib/site-config';
import { LANDING_FAQ_ITEMS } from '@/lib/landing-faq';

function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

export function LandingJsonLd() {
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Gaston Stock',
    url: SITE_URL,
    logo: absoluteUrl('/logo_onglet_internet.png'),
    email: 'contact@gastonstock.com',
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'contact@gastonstock.com',
        telephone: '+33-6-23-93-74-52',
        areaServed: 'FR',
        availableLanguage: ['French'],
      },
    ],
  };

  const softwareApplication = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Gaston Stock',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web (navigateur)',
    url: SITE_URL,
    description:
      'Logiciel SaaS pour les professionnels du dépôt-vente : gestion des dépôts et relevés, commissions, facturation conforme et préparation à la facturation électronique.',
    screenshot: absoluteUrl('/og-gaston-stock.jpg'),
    provider: {
      '@type': 'Organization',
      name: 'Gaston Stock',
      url: SITE_URL,
      email: 'contact@gastonstock.com',
    },
    offers: {
      '@type': 'Offer',
      name: 'Abonnement Gaston Stock',
      description:
        'Tarification sur devis selon les caractéristiques de votre activité et vos besoins (volume, organisation, fonctionnalités).',
      url: `${SITE_URL}/#devis`,
    },
  };

  const faqPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: LANDING_FAQ_ITEMS.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  };

  return (
    <>
      <JsonLdScript data={organization} />
      <JsonLdScript data={softwareApplication} />
      <JsonLdScript data={faqPage} />
    </>
  );
}
