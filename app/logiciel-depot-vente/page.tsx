import type { Metadata } from 'next';
import Link from 'next/link';
import { absoluteUrl } from '@/lib/site-config';
import { DEPOT_VENTE_FAQ_ITEMS } from '@/lib/seo-pages/depot-vente-faq';
import {
  SeoPublicShell,
  SeoFaqJsonLd,
  SeoCtaBand,
} from '@/components/marketing/seo-public-shell';

const pageTitle = 'Logiciel dépôt-vente | Suivi stock & facturation | Gaston Stock';
const pageDescription =
  'Logiciel dépôt-vente pour suivre le stock chez vos revendeurs, calculer les produits vendus et facturer uniquement ce qui a réellement été vendu. Demandez un devis.';

export const metadata: Metadata = {
  title: { absolute: pageTitle },
  description: pageDescription,
  alternates: {
    canonical: '/logiciel-depot-vente',
  },
  openGraph: {
    url: absoluteUrl('/logiciel-depot-vente'),
    title: pageTitle,
    description: pageDescription,
    images: [absoluteUrl('/og-gaston-stock.jpg')],
  },
  twitter: {
    card: 'summary_large_image',
    title: pageTitle,
    description: pageDescription,
    images: [absoluteUrl('/og-gaston-stock.jpg')],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function LogicielDepotVentePage() {
  return (
    <SeoPublicShell
      secondaryNav={{
        href: '/gestion-stock-grossiste-depot-vente',
        label: 'Stock chez plusieurs clients',
      }}
    >
      <SeoFaqJsonLd items={DEPOT_VENTE_FAQ_ITEMS} />

      {/* Hero */}
      <section className="bg-[radial-gradient(circle_at_10%_20%,rgba(15,111,255,0.12),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(12,87,202,0.12),transparent_40%),linear-gradient(180deg,#f9fbff_0%,#ffffff_60%)]">
        <div className="mx-auto max-w-4xl px-6 pb-14 pt-10 md:pb-20 md:pt-14">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Gaston Stock
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-[#0B1F33] md:text-5xl">
            Le logiciel de gestion dédié aux grossistes en dépôt-vente
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-600">
            Vous déposez des produits chez plusieurs revendeurs, à chaque passage, vous faites l'inventaire du stock vendu pour faturer le client. 
            <br />
            Gaston Stock centralise ce cycle — dépôt, relevé, calcul des ventes, facturation — dans une application conçue pour ce métier.
            <br />
            Trouvez votre logiciel pour fiabiliser, simplifier et accélérer votre gestion de dépôt-vente.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/#devis"
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
            >
              Demander un devis
            </Link>
            <Link
              href="/auth"
              className="rounded-lg border border-slate-200 px-6 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            >
              Créer un compte
            </Link>
          </div>
        </div>
      </section>

      {/* Qu'est-ce que */}
      <section className="border-t border-slate-100 px-6 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-[#0B1F33]">
            Qu&apos;est-ce qu'une activité en dépôt-vente ?
          </h2>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Dans une activité en dépôt-vente, vous confiez des produits à un point de vente (grande surface, maison de
            la presse, magasin partenaire…). Le stock reste votre propriété jusqu&apos;à la vente.
            Vous revenez plus tard pour compter le stock restant : la différence avec le stock
            précédent correspond aux produits vendus. C&apos;est sur ces quantités que repose
            généralement la facturation.
          </p>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Un logiciel de dépôt-vente n&apos;est donc pas un simple inventaire d&apos;entrepôt : il
            doit coller à ce rythme — déposer, relever, calculer, facturer — chez plusieurs
            revendeurs.
          </p>
        </div>
      </section>

      {/* Pourquoi compliqué */}
      <section className="bg-slate-50 px-6 py-14">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-[#0B1F33]">
            Pourquoi le suivi d&apos;un dépôt-vente devient compliqué
          </h2>
          <p className="mt-4 max-w-3xl text-slate-600">
            Avec seulement quelques points de vente, un carnet ou un fichier excel peuvent suffire. Dès que le réseau
            s&apos;élargit, la charge administrative augmente.
            Suivi des stocks, relevés, préparation des tournées, facturation, retours, etc.
            Tout cela devient vite chronophage et source d'erreurs.

            Gaston Stock est un logiciel conçu pour simplifier cette gestion complexe, vous y retrouverez tous les outils pour gérer votre activité en dépôt-vente : 
            Inventaires, Bons de livraison, facturation électronique, statistiques, tout y est !
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              {
                t: 'Plusieurs revendeurs',
                d: 'Chaque client a son propre stock, ses propres fréquences de passages et son historique.',
              },
              {
                t: 'Relevés espacés',
                d: 'Entre deux visites, il faut retrouver le dernier dépôt, calculer les ventes, facturer le client, gérer le réassort etc.',
              },
              {
                t: 'Calcul des ventes',
                d: 'La différence stock précédent / stock restant doit être fiable pour facturer correctement, et surtout efficace. Gaston Stock reprend automatiquement le dernier bon de dépôt pour calculer les ventes.',
              },
              {
                t: 'Facturation et retours',
                d: 'Invendus récupérés, nouveaux dépôts et documents associés se multiplient vite. Gaston Stock vous permet de gérer toutes ces opérations de manière simple et efficace.',
              },
            ].map((item) => (
              <li
                key={item.t}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h3 className="font-semibold text-[#0B1F33]">{item.t}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Comment fonctionne */}
      <section className="px-6 py-14">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-[#0B1F33]">Comment fonctionne Gaston Stock ?</h2>
          <p className="mt-4 text-slate-600 leading-relaxed">
            L&apos;application suit le cycle réel du terrain. Vous enregistrez vos clients et vos
            produits, vous déposez du stock, puis lors d&apos;un passage vous saisissez le stock
            compté. Gaston Stock calcule les quantités vendues et vous permet d&apos;enchaîner sur
            la facturation des produits réellement vendus. Avoir un logiciel centralisé permet de gagner du temps et de gagner en fiabilité.
          </p>

          <div className="mt-8 text-center">
            <Link
              href="/"
              className="inline-flex rounded-lg border border-slate-200 px-6 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            >
              Découvrir Gaston Stock
            </Link>
          </div>
        </div>
      </section>

      {/* Stock par revendeur */}
      <section className="border-t border-slate-100 bg-slate-50 px-6 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-[#0B1F33]">
            Suivre le stock chez chaque revendeur
          </h2>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Chaque client/revendeur dispose de son propre suivi. Vous savez ce qui a été déposé, ce
            qui reste après le dernier relevé, et vous conservez l&apos;historique des mouvements.
            C&apos;est la base pour organiser vos tournées et préparer la facturation point de vente
            par point de vente.
          </p>
        </div>
      </section>

      {/* Calculer vendus */}
      <section className="px-6 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-[#0B1F33]">Calculer les produits vendus</h2>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Au lieu de reconstruire le calcul à la main dans un tableur, vous saisissez le stock
            compté lors du passage. L&apos;application s&apos;appuie sur le stock de référence
            précédent pour déterminer les quantités vendues. Vous réduisez le risque d&apos;oubli
            ou d&apos;erreur de formule entre deux fichiers.
          </p>
        </div>
      </section>

      {/* Facturer */}
      <section className="bg-slate-50 px-6 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-[#0B1F33]">
            Obtenir des statistiques sur votre activité
          </h2>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Obtenez des statistiques tout au long de l'année pour vous appuyer dans vos décisions commerciales.
            Suivez votre Chiffre d'affaires, les produits les plus vendus, les clients les plus rentables, etc.
            Gaston Stock vous permet de générer des rapports et des graphiques pour vous aider à analyser votre activité.
            Toutes les données sont centralisées dans une seule application, vous n'avez plus besoin de recopier des données de tableur en tableur.
          </p>
        </div>
      </section>

      {/* Invendus */}
      <section className="px-6 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-[#0B1F33]">
            Gérer les invendus et les retours
          </h2>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Lors d&apos;un passage, vous pouvez récupérer des invendus et mettre à jour le stock
            chez le revendeur. Les mouvements restent tracés dans l&apos;historique, ce qui évite
            de perdre la cohérence entre le terrain et la facturation.
          </p>
        </div>
      </section>

      {/* Excel */}
      <section className="border-t border-slate-100 bg-slate-50 px-6 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-[#0B1F33]">
            Pourquoi utiliser un logiciel plutôt qu&apos;Excel ?
          </h2>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Excel peut tout à fait fonctionner avec peu de clients et un historique court. La
            difficulté apparaît lorsque le nombre de revendeurs augmente, que les relevés se
            multiplient, que les calculs de ventes doivent être répétés à chaque visite, et que
            facturation et retours doivent rester alignés avec le stock.
          </p>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Gaston Stock centralise ce fonctionnement dans une application conçue pour le
            dépôt-vente : stocks par client, relevés, ventes calculées et documents associés.
          </p>
        </div>
      </section>

      {/* À qui */}
      <section className="px-6 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-[#0B1F33]">À qui s&apos;adresse Gaston Stock ?</h2>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Aux entreprises qui déposent leurs produits chez plusieurs revendeurs et doivent
            régulièrement compter le stock restant pour facturer les ventes. Les utilisateurs sont notamment des distributeurs en carterie, en jouets, en livres, en objets fait main (grandes surfaces, maisons de
            la presse, tabacs-presse, petits commerces, etc.). Le logiciel s&apos;adapte parfaitement à tous les secteurs d'activités qui font du dépôt-vente : le même
            principe s&apos;applique dès que votre organisation repose sur le dépôt-vente.
          </p>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Si votre enjeu principal est plutôt de{' '}
            <Link
              href="/gestion-stock-grossiste-depot-vente"
              className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700"
            >
              centraliser le stock réparti chez plusieurs clients
            </Link>
            , cette page détaille cet angle.
          </p>
        </div>
      </section>

      {/* Avantages */}
      <section className="bg-slate-50 px-6 py-14">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-[#0B1F33]">Les avantages de Gaston Stock</h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              'Centralisation de la gestion et la facturation dans une seule application',
              'Votre application multi-support : web, mobile, tablette',
              'Accessible par votre comptable ou votre assistant comptable',
              'Compatible avec la facturation électronique',
              'Historique complet des mouvements et des retours',
              'Interface simple, adaptée au terrain',
              'Statistiques sur votre activité',
              'Gestion des stocks et des réassorts',
              'Gestion des retours et des invendus',
            ].map((label) => (
              <li
                key={label}
                className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-[#0B1F33] shadow-sm"
              >
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-[#0B1F33]">FAQ — logiciel dépôt-vente</h2>
          <div className="mt-8 space-y-4">
            {DEPOT_VENTE_FAQ_ITEMS.map(([question, answer]) => (
              <details
                key={question}
                className="group rounded-xl border border-slate-200 bg-white p-5 open:shadow-sm"
              >
                <summary className="cursor-pointer list-none font-semibold text-[#0B1F33] marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-start justify-between gap-4">
                    {question}
                    <span className="shrink-0 text-slate-400 transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <SeoCtaBand
        title="Prêt à simplifier votre activité en dépôt-vente ?"
        description="Demandez un devis adapté à votre activité, ou créez un compte pour découvrir Gaston Stock."
      />
    </SeoPublicShell>
  );
}
