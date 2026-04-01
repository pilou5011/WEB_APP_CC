import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Mentions légales | Gaston Stock',
  description:
    'Mentions légales de Gaston Stock, logiciel SaaS de gestion et facturation pour les professionnels du dépôt-vente.',
};

export default function MentionsLegalesPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-[#0a1f44]">Mentions légales</h1>
        <p className="mt-3 text-sm text-slate-500">Dernière mise à jour : 1 avril 2026</p>

        <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">1. Éditeur du site</h2>
          <p>
            Le présent site est édité par <strong>Gaston Stock</strong>.
          </p>
          <p>
            <strong>Raison sociale :</strong> Pierre-Louis CHEVALLIER
            <br />
            <strong>Forme juridique :</strong> Entrepreneur individuel (micro-entreprise)
            <br />
            <strong>Siège social :</strong> 72 rue de Normandie, 92400 Courbevoie
            <br />
            <strong>SIRET :</strong> 95117893800027
            <br />
            <strong>Email :</strong> contact@gastonstock.com
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">2. Directeur de la publication</h2>
          <p>
            <strong>Directeur de la publication :</strong> Pierre-Louis CHEVALLIER
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">3. Hébergement</h2>
          <p>
            <strong>Hébergeur :</strong> OVH
            <br />
            <strong>Adresse :</strong> 2 rue Kellermann
            59100 Roubaix
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">4. Propriété intellectuelle</h2>
          <p>
            L&apos;ensemble des contenus présents sur ce site (textes, visuels, éléments graphiques, logos, structure,
            code, bases de données, etc.) est protégé par les dispositions du Code de la propriété intellectuelle et
            demeure la propriété exclusive de Gaston Stock ou de ses partenaires.
          </p>
          <p>
            Toute reproduction, représentation, adaptation ou exploitation, totale ou partielle, sans autorisation
            préalable écrite est strictement interdite.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">5. Responsabilité</h2>
          <p>
            Gaston Stock met en œuvre tous les moyens raisonnables pour assurer l&apos;exactitude et la mise à jour des
            informations publiées. Toutefois, l&apos;éditeur ne saurait garantir l&apos;absence d&apos;erreurs, d&apos;omissions ou
            d&apos;indisponibilité temporaire.
          </p>
          <p>
            L&apos;utilisateur demeure seul responsable de l&apos;usage qu&apos;il fait des informations et fonctionnalités
            proposées sur le site.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">6. Liens hypertextes</h2>
          <p>
            Le site peut contenir des liens vers des sites tiers. Gaston Stock n&apos;exerce aucun contrôle sur ces
            contenus externes et décline toute responsabilité quant à leur disponibilité, leur contenu ou leur
            politique de confidentialité.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">7. Droit applicable</h2>
          <p>
            Les présentes mentions légales sont soumises au droit français. En cas de litige et à défaut d&apos;accord
            amiable, compétence est attribuée aux juridictions françaises compétentes.
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

