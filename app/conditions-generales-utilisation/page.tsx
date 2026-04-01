import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation | Gaston Stock",
  description:
    "Conditions Générales d'Utilisation de Gaston Stock, solution SaaS de gestion et facturation pour les professionnels du dépôt-vente.",
};

export default function ConditionsGeneralesUtilisationPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-[#0a1f44]">Conditions Générales d&apos;Utilisation</h1>
        <p className="mt-3 text-sm text-slate-500">Version : V202604 - Date : 1 avril 2026</p>

        <p className="mt-6 text-sm leading-7 text-slate-700">
          Les présentes Conditions Générales d&apos;Utilisation (CGU) encadrent l&apos;accès et l&apos;usage du site et du
          logiciel Gaston Stock. En naviguant sur le site ou en utilisant le service, l&apos;utilisateur accepte les
          présentes CGU, ainsi que les Mentions légales et la Politique de confidentialité.
        </p>

        <section className="mt-8 space-y-3 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">1. Définitions</h2>
          <p>
            <strong>Éditeur :</strong> la société exploitant Gaston Stock.
            <br />
            <strong>Site :</strong> le site internet permettant d&apos;accéder aux informations et au service.
            <br />
            <strong>Service :</strong> l&apos;application SaaS Gaston Stock.
            <br />
            <strong>Utilisateur :</strong> toute personne physique ou morale utilisant le site ou le service, à titre
            professionnel.
            <br />
            <strong>Compte :</strong> espace personnel permettant d&apos;accéder au service.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">2. Objet des CGU</h2>
          <p>
            Les présentes CGU ont pour objet de définir les conditions d&apos;accès, d&apos;utilisation et de mise à
            disposition du service Gaston Stock, notamment pour la gestion d&apos;activité dépôt-vente, du stock, de la
            facturation et des documents associés.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">3. Accès au service</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Le service est réservé aux utilisateurs professionnels.</li>
            <li>L&apos;utilisateur déclare être habilité à créer un compte au nom de sa structure.</li>
            <li>Les informations fournies lors de l&apos;inscription doivent être exactes et à jour.</li>
            <li>
              L&apos;accès au compte est personnel : l&apos;utilisateur est responsable de la confidentialité de ses
              identifiants.
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-3 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">4. Description du service</h2>
          <p>Gaston Stock permet notamment :</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>la gestion des clients, produits, dépôts, relevés de stock et reprises de stock ;</li>
            <li>le suivi des ventes et des commissions ;</li>
            <li>la génération de documents commerciaux et de facturation ;</li>
            <li>l&apos;évolution vers les exigences de facturation électronique.</li>
          </ul>
          <p>
            Les fonctionnalités peuvent évoluer à tout moment afin d&apos;améliorer le service, de corriger des anomalies
            ou de répondre à des évolutions réglementaires.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">5. Obligations de l&apos;utilisateur</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Utiliser le service conformément à sa destination professionnelle et à la réglementation applicable.</li>
            <li>Ne pas porter atteinte à la sécurité, l&apos;intégrité ou la disponibilité du service.</li>
            <li>Renseigner des données exactes et licites.</li>
            <li>Mettre en place des mesures de sécurité adaptées sur ses propres équipements.</li>
            <li>Conserver des sauvegardes lorsque cela est nécessaire à son activité.</li>
          </ul>
        </section>

        <section className="mt-8 space-y-3 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">6. Disponibilité, maintenance et mises à jour</h2>
          <p>
            Gaston Stock met en œuvre des moyens raisonnables pour assurer une disponibilité élevée du service. Des
            interruptions temporaires peuvent intervenir notamment en cas de maintenance, de mise à jour, de surcharge
            réseau ou d&apos;incident technique.
          </p>
          <p>
            L&apos;éditeur se réserve le droit d&apos;effectuer toute intervention nécessaire au bon fonctionnement du
            service.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">7. Responsabilité</h2>
          <p>
            Le service est fourni avec une obligation de moyens. L&apos;éditeur ne saurait être responsable des dommages
            indirects, pertes d&apos;exploitation, pertes de données, manque à gagner ou préjudices commerciaux subis par
            l&apos;utilisateur.
          </p>
          <p>
            L&apos;utilisateur demeure responsable du paramétrage de son compte, de la qualité des données saisies et des
            décisions prises sur la base des informations produites par le service.
          </p>
          <p>
            En cas de cyberattaque, de force majeure ou d&apos;événement externe affectant les réseaux, la responsabilité
            de l&apos;éditeur ne pourra être engagée au-delà des limites prévues par la loi.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">8. Données personnelles</h2>
          <p>
            Le traitement des données personnelles est encadré par la Politique de confidentialité. L&apos;utilisateur
            demeure responsable des données qu&apos;il intègre dans son espace et garantit disposer des droits nécessaires.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">9. Propriété intellectuelle</h2>
          <p>
            Le site, le service et tous leurs éléments (marques, logos, textes, code, interfaces, bases de données,
            documentation) sont protégés par le droit de la propriété intellectuelle.
          </p>
          <p>
            Toute reproduction, extraction, adaptation, rétro-ingénierie ou exploitation non autorisée est interdite.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">10. Durée, suspension et résiliation</h2>
          <p>
            Les CGU s&apos;appliquent pendant toute la durée d&apos;utilisation du service. L&apos;éditeur peut suspendre ou
            restreindre l&apos;accès en cas de non-respect des présentes CGU, d&apos;usage frauduleux ou de risque pour la
            sécurité.
          </p>
          <p>
            L&apos;utilisateur peut cesser d&apos;utiliser le service à tout moment, selon les modalités contractuelles qui
            lui sont applicables.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">11. Modification des CGU</h2>
          <p>
            Les CGU peuvent être modifiées à tout moment afin de tenir compte des évolutions légales, réglementaires,
            techniques ou fonctionnelles. La version applicable est celle publiée en ligne à la date d&apos;utilisation du
            service.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">12. Droit applicable et juridiction compétente</h2>
          <p>
            Les présentes CGU sont soumises au droit français. En cas de litige et à défaut de résolution amiable,
            compétence expresse est attribuée au Tribunal de commerce de Nanterre, sauf
            disposition légale impérative contraire.
          </p>
        </section>

        <div className="mt-10 border-t border-slate-200 pt-6 text-sm">
          <Link href="/landing" className="text-blue-700 hover:underline">
            Retour à la page d&apos;accueil
          </Link>
        </div>
      </div>
    </main>
  );
}

