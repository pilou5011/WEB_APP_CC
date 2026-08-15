import type { Metadata } from 'next';
import Link from 'next/link';
import { absoluteUrl } from '@/lib/site-config';
import { GESTION_STOCK_GROSSISTE_FAQ_ITEMS } from '@/lib/seo-pages/gestion-stock-grossiste-faq';
import {
  SeoPublicShell,
  SeoFaqJsonLd,
  SeoCtaBand,
} from '@/components/marketing/seo-public-shell';

const pageTitle = 'Gestion stock grossiste | Stock chez les revendeurs | Gaston Stock';
const pageDescription =
  'Centralisez la gestion du stock réparti chez vos clients et revendeurs : stock par point de vente, ventes constatées et facturation. Demandez un devis Gaston Stock.';

export const metadata: Metadata = {
  title: { absolute: pageTitle },
  description: pageDescription,
  alternates: {
    canonical: '/gestion-stock-grossiste-depot-vente',
  },
  openGraph: {
    url: absoluteUrl('/gestion-stock-grossiste-depot-vente'),
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

export default function GestionStockGrossistePage() {
  return (
    <SeoPublicShell
      secondaryNav={{
        href: '/logiciel-depot-vente',
        label: 'Logiciel dépôt-vente',
      }}
    >
      <SeoFaqJsonLd items={GESTION_STOCK_GROSSISTE_FAQ_ITEMS} />

      {/* Hero */}
      <section className="bg-[radial-gradient(circle_at_85%_15%,rgba(15,111,255,0.12),transparent_40%),linear-gradient(180deg,#f8fafc_0%,#ffffff_55%)]">
        <div className="mx-auto max-w-4xl px-6 pb-14 pt-10 md:pb-20 md:pt-14">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Gaston Stock
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-[#0B1F33] md:text-5xl">
            Gestion du stock chez les grossistes en dépôt-vente : centraliser le stock de vos revendeurs
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-600">
            Une partie de votre stock n&apos;est plus dans votre entrepôt : elle est chez vos
            clients et revendeurs. La question n&apos;est plus seulement « combien j&apos;ai en
            stock au total ? », mais « combien reste-t-il chez chaque point de vente, et qu&apos;est-ce
            qui a été vendu depuis mon dernier passage ? ». 

            <br />
            Gaston Stock centralise ce suivi.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/#devis"
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
            >
              Demander un devis
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-slate-200 px-6 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            >
              Découvrir Gaston Stock
            </Link>
          </div>
        </div>
      </section>

      {/* Quand stock réparti */}
      <section className="border-t border-slate-100 px-6 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-[#0B1F33]">
            Votre stock est réparti chez vos clients
          </h2>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Une gestion de stock classique dans un entrepôt unique suppose que vous contrôlez
            l&apos;emplacement et les mouvements au quotidien. Dès que vous distribuez des produits
            chez plusieurs revendeurs et que le stock y reste jusqu&apos;à la vente (ou jusqu&apos;à
            un retour), le suivi change de nature : chaque client devient un lieu de stockage à
            part entière, avec ses propres niveaux et son propre rythme de relevés.
            Gaston Stock vous permet de centraliser le suivi de votre stock chez vos clients et 
            d&apos;avoir une vision globale de votre stock en temps réel.
          </p>
        </div>
      </section>

      {/* Difficultés multi-clients */}
      <section className="bg-slate-50 px-6 py-14">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-[#0B1F33]">
            Les difficultés d&apos;une gestion de stock multi-clients
          </h2>
          <p className="mt-4 max-w-3xl text-slate-600">
            Sans outil central, l&apos;information se disperse entre tournées, fichiers et
            documents.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                t: 'Plusieurs lieux de stockage',
                d: 'Le stock utile n’est plus seulement chez vous : il est aussi chez chaque revendeur.',
              },
              {
                t: 'Incohérences entre les stocks facturés et les stocks relevés',
                d: 'Gérer les stocks de nombreux clients implique une gestion complexe et chronophage.',
              },
              {
                t: 'Relevés et ventes',
                d: 'Il faut croiser stock déposé, stock restant et ventes entre deux passages pour facturer correctement.',
              },
              {
                t: 'Mouvements et retours',
                d: 'Nouveaux dépôts, reprises d’invendus et corrections doivent rester cohérents.',
              },
              {
                t: 'Facturation Electronique',
                d: 'Avec la nouvelle reforme, il faut croiser logiciel de gestion et logiciel de facturation.'
              },
              {
                t: 'Historique',
                d: 'Sans mémoire centralisée, difficile de retrouver qui avait quoi à quelle date.',
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

      {/* Centraliser */}
      <section className="px-6 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-[#0B1F33]">
            Centralisez le suivi de vos stocks avec Gaston Stock
          </h2>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Gaston Stock regroupe clients, produits, stocks chez les revendeurs, relevés et
            facturation dans une application web unique. L&apos;objectif n&apos;est pas de
            remplacer un ERP d&apos;entrepôt : c&apos;est de donner une vision claire du stock
            confié sur le terrain, pour savoir ce qui reste, ce qui a été vendu, et ce qu&apos;il
            faut facturer. 
            <br />
            Gaston Stock vous permet de centraliser la gestion et la facturation dans un seul et même logiciel.
          </p>
        </div>
      </section>

      {/* Stock par client */}
      <section className="border-t border-slate-100 bg-slate-50 px-6 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-[#0B1F33]">
            Suivez le stock déposé chez chaque client en temps réel
          </h2>
          <p className="mt-4 text-slate-600 leading-relaxed">
            La vision par client/revendeur est au cœur de l&apos;outil. Vous consultez le stock
            présent chez un point de vente, vous mettez à jour après un passage, et vous conservez
            une trace des évolutions. C&apos;est cette granularité qui permet une gestion stock
            multi-clients sans multiplier les tableurs.
          </p>
        </div>
      </section>

      {/* Identifier ventes */}
      <section className="px-6 py-14">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-[#0B1F33]">Identifiez les ventes réalisées</h2>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Sur le terrain, la vente se déduit souvent d&apos;un écart de stock : ce qui a été
            livré ou déposé, moins ce qui reste au comptage. Voici le même principe, présenté sous
            l&apos;angle de la distribution multi-clients.
          </p>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <p className="text-sm font-semibold text-slate-500">
              Stock livré / déposé − stock restant = ventes
            </p>
            <ol className="mt-6 space-y-4">
              <li className="flex gap-4 border-b border-slate-100 pb-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  1
                </span>
                <div>
                  <p className="font-semibold text-[#0B1F33]">100 unités chez le client</p>
                  <p className="text-sm text-slate-600">
                    Référence de départ après dépôt ou dernier état connu.
                  </p>
                </div>
              </li>
              <li className="flex gap-4 border-b border-slate-100 pb-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                  2
                </span>
                <div>
                  <p className="font-semibold text-[#0B1F33]">63 unités restantes au relevé</p>
                  <p className="text-sm text-slate-600">
                    Vous comptez ce qui est encore présent chez le revendeur.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                  3
                </span>
                <div>
                  <p className="font-semibold text-[#0B1F33]">37 unités vendues</p>
                  <p className="text-sm text-slate-600">
                    Gaston Stock s&apos;appuie sur cet écart pour documenter les ventes et préparer
                    la facturation.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* Mouvements */}
      <section className="bg-slate-50 px-6 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-[#0B1F33]">Suivez les mouvements de stock</h2>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Entre deux passages, le stock chez un client évolue : nouveaux dépôts, ventes
            constatées au relevé, reprises d&apos;invendus. Gaston Stock conserve l&apos;historique
            de ces mouvements par client, pour que le stock affiché reste cohérent avec ce que vous
            avez enregistré sur le terrain. Vous avez la possibilité d'envoyer au client les relevés de stock pour qu'il puisse lui aussi avoir une vision globale de son stock.
          </p>
        </div>
      </section>

      {/* Facturation */}
      <section className="px-6 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-[#0B1F33]">Facilitez la facturation</h2>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Une fois les ventes identifiées à partir du stock restant, vous pouvez facturer les
            quantités concernées. 
            La facture s'édite directement dans Gaston Stock, vous avez la possibilité d'imprimer la facture et de l'envoyer par email.
            Le lien entre relevé, stock et document de vente limite les
            recopies manuelles et les écarts entre ce qui a été compté et ce qui a été facturé.
          </p>
        </div>
      </section>

      {/* Excel centralisation */}
      <section className="border-t border-slate-100 bg-slate-50 px-6 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-[#0B1F33]">
            Pourquoi centraliser plutôt que multiplier les fichiers Excel ?
          </h2>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Un fichier par client (ou un onglet par point de vente) peut sembler simple au démarrage.
            Avec le temps, la vision globale se perd : qui a encore du stock, où faut-il passer, que
            facturer après la dernière tournée ? Centraliser dans Gaston Stock, c&apos;est disposer
            d&apos;une vue d&apos;ensemble des stocks chez les clients, sans abandonner le détail
            par revendeur.
          </p>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Excel reste un excellent outil pour beaucoup d&apos;usages. Ici, l&apos;enjeu est
            d&apos;éviter la dispersion lorsqu&apos;il faut piloter simultanément plusieurs stocks
            clients, leurs ventes et leur facturation.
          </p>
        </div>
      </section>

      {/* À qui */}
      <section className="px-6 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-[#0B1F33]">À qui s&apos;adresse Gaston Stock ?</h2>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Gaston Stock s&apos;adresse notamment aux entreprises qui distribuent leurs produits
            auprès de plusieurs revendeurs et doivent suivre le stock présent chez chacun — puis
            facturer les ventes constatées. Ce n&apos;est pas un logiciel généraliste de gestion de
            stock pour tous les grossistes, ni un ERP d&apos;entrepôt. Il est pensé pour le
            fonctionnement en dépôt-vente / stock chez les clients.
          </p>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Les premiers utilisateurs sont notamment des distributeurs en carterie, jouets, livres, objets fait main, etc. 
            
            <br />
            Si vous cherchez plutôt le détail du cycle métier dépôt → relevé → facturation, consultez la
            page{' '}
            <Link
              href="/logiciel-depot-vente"
              className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700"
            >
              logiciel dépôt-vente
            </Link>
            .
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-50 px-6 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-[#0B1F33]">
            FAQ — gestion dépôt-vente
          </h2>
          <div className="mt-8 space-y-4">
            {GESTION_STOCK_GROSSISTE_FAQ_ITEMS.map(([question, answer]) => (
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
        title="Centralisez le suivi de vos stocks clients"
        description="Échangez sur votre organisation (nombre de points de vente, rythme des relevés) et obtenez un devis adapté — ou créez un compte."
      />
    </SeoPublicShell>
  );
}
