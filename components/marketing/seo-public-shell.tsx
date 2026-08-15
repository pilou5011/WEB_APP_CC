import Link from 'next/link';

const CONTACT_EMAIL = 'contact@gastonstock.com';

type SeoPublicShellProps = {
  children: React.ReactNode;
  /** Lien secondaire du header (ex. vers l’autre page SEO). */
  secondaryNav?: { href: string; label: string };
};

export function SeoPublicShell({ children, secondaryNav }: SeoPublicShellProps) {
  return (
    <main className="bg-white text-slate-800 antialiased">
      <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-white/85">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6 sm:py-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
            <Link
              href="/"
              className="text-xs font-semibold uppercase tracking-wide text-blue-600 sm:text-sm"
            >
              Gaston Stock • Spécialiste du dépôt-vente
            </Link>
            {secondaryNav && (
              <Link
                href={secondaryNav.href}
                className="text-xs font-medium text-slate-600 hover:text-blue-600 sm:text-sm"
              >
                {secondaryNav.label}
              </Link>
            )}
          </div>
          <Link
            href="/auth"
            className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 sm:px-4 sm:text-sm"
          >
            Connexion / Créer un compte
          </Link>
        </div>
      </header>

      {children}

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-10 md:grid-cols-3">
          <div>
            <p className="font-semibold text-[#0B1F33]">Gaston Stock</p>
            <p className="mt-2 text-sm text-slate-600">
              Le logiciel SaaS spécialisé pour les professionnels du dépôt-vente.
            </p>
          </div>
          <div>
            <p className="font-semibold text-[#0B1F33]">Contact & devis</p>
            <p className="mt-2 text-sm">
              <Link
                href="/#devis"
                className="font-medium text-[#0B1F33] underline decoration-[#0B1F33]/30 underline-offset-2 hover:decoration-[#0B1F33]"
              >
                Demander un devis
              </Link>
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Email :{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="underline hover:text-[#0B1F33]"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
            <p className="text-sm text-slate-600">
              Tél :{' '}
              <a href="tel:+33623937452" className="underline hover:text-[#0B1F33]">
                06 23 93 74 52
              </a>
            </p>
          </div>
          <div>
            <p className="font-semibold text-[#0B1F33]">Ressources</p>
            <p className="mt-2 text-sm">
              <Link href="/logiciel-depot-vente" className="text-slate-600 hover:text-blue-600 hover:underline">
                Logiciel dépôt-vente
              </Link>
            </p>
            <p className="text-sm">
              <Link
                href="/gestion-stock-grossiste-depot-vente"
                className="text-slate-600 hover:text-blue-600 hover:underline"
              >
                Gestion stock chez les revendeurs
              </Link>
            </p>
            <p className="mt-2 text-sm">
              <Link href="/mentions-legales" className="text-slate-600 hover:text-blue-600 hover:underline">
                Mentions légales
              </Link>
            </p>
            <p className="text-sm">
              <Link
                href="/politique-confidentialite"
                className="text-slate-600 hover:text-blue-600 hover:underline"
              >
                Politique de confidentialité
              </Link>
            </p>
            <p className="text-sm">
              <Link
                href="/conditions-generales-utilisation"
                className="text-slate-600 hover:text-blue-600 hover:underline"
              >
                Conditions Générales d&apos;Utilisation
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

export function SeoFaqJsonLd({
  items,
}: {
  items: ReadonlyArray<readonly [string, string]>;
}) {
  const faqPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
    />
  );
}

export function SeoCtaBand({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="bg-[#0B1F33] px-6 py-14 text-white">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-3xl font-bold">{title}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-slate-200">{description}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/#devis"
            className="rounded-lg bg-white px-6 py-3 font-semibold text-[#0B1F33] transition hover:bg-slate-100"
          >
            Demander un devis
          </Link>
          <Link
            href="/auth"
            className="rounded-lg border border-white/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
          >
            Créer un compte
          </Link>
        </div>
      </div>
    </section>
  );
}
