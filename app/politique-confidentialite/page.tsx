import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Politique de confidentialité | Gaston Stock',
  description:
    'Politique de confidentialité de Gaston Stock : collecte, usage, conservation et protection des données personnelles.',
  alternates: {
    canonical: '/politique-confidentialite',
  },
};

export default function PolitiqueConfidentialitePage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-[#0a1f44]">Politique de confidentialité</h1>
        <p className="mt-3 text-sm text-slate-500">Dernière mise à jour : 1 avril 2026</p>
        <p className="mt-2 text-sm text-slate-500">Version : V202604</p>

        <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">1. Introduction et portée</h2>
          <p>
            La présente Politique de confidentialité a pour objet de vous informer de manière transparente sur la
            collecte et le traitement de vos données personnelles dans le cadre de l&apos;utilisation du site et du
            service SaaS Gaston Stock.
          </p>
          <p>
            Elle est établie conformément au Règlement (UE) 2016/679 (RGPD) et à la loi Informatique et Libertés
            modifiée.
          </p>
          <p>
            Elle s&apos;applique aux visiteurs du site, aux prospects et aux utilisateurs du service, et complète les
            Mentions légales ainsi que les Conditions Générales d&apos;Utilisation.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">2. Responsable du traitement</h2>
          <p>
            <strong>Responsable du traitement :</strong> GASTON STOCK
            <br />
            <strong>Contact :</strong> contact@gastonstock.com
            <br />
            <strong>Adresse :</strong> 72 rue de Normandie, 92400 Courbevoie
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">3. Définitions principales</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Donnée personnelle :</strong> toute information se rapportant à une personne physique identifiée
              ou identifiable.
            </li>
            <li>
              <strong>Traitement :</strong> toute opération appliquée à des données personnelles (collecte,
              enregistrement, consultation, conservation, suppression, etc.).
            </li>
            <li>
              <strong>Personne concernée :</strong> utilisateur du site ou du service dont les données sont traitées.
            </li>
            <li>
              <strong>Sous-traitant :</strong> prestataire traitant des données pour le compte de Gaston Stock.
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">4. Principes appliqués au traitement</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Licéité, loyauté et transparence.</li>
            <li>Finalités déterminées, explicites et légitimes.</li>
            <li>Minimisation des données collectées.</li>
            <li>Exactitude et mise à jour des données.</li>
            <li>Limitation de la conservation.</li>
            <li>Intégrité, confidentialité et sécurité.</li>
          </ul>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">5. Catégories de données collectées</h2>
          <p>Selon votre usage, nous pouvons collecter notamment :</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Données d&apos;identification (nom, prénom, entreprise, email, téléphone).</li>
            <li>Données de compte (identifiants, rôle utilisateur, préférences).</li>
            <li>Données d&apos;usage (journaux techniques, date/heure d&apos;accès, actions réalisées).</li>
            <li>Données métier saisies dans l&apos;application (clients, produits, stocks, facturation).</li>
            <li>Données de contact commercial (messages envoyés via formulaire de devis/contact).</li>
            <li>Données de navigation (adresse IP, informations de session, consentements cookies).</li>
          </ul>
          <p>
            Nous ne sollicitons pas de données sensibles, sauf obligation légale ou nécessité strictement encadrée.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">6. Finalités et bases légales</h2>
          <p>Les traitements poursuivent notamment les finalités suivantes :</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Fourniture du service et gestion des comptes (exécution du contrat).</li>
            <li>Support utilisateur et amélioration continue (intérêt légitime).</li>
            <li>Gestion de la relation commerciale et des demandes de devis (mesures précontractuelles).</li>
            <li>Respect des obligations légales, fiscales et comptables (obligation légale).</li>
            <li>Prospection B2B et communication de service (intérêt légitime, sous réserve d&apos;opposition).</li>
          </ul>
          <p>
            Certaines données sont nécessaires pour exécuter le service. En cas de non-fourniture, certaines
            fonctionnalités peuvent être indisponibles.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">7. Contextes de collecte des données</h2>
          <p>Les données sont notamment collectées lors des situations suivantes :</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>navigation sur le site ;</li>
            <li>création et gestion d&apos;un compte ;</li>
            <li>utilisation des fonctionnalités du service ;</li>
            <li>demandes de support et assistance ;</li>
            <li>envoi d&apos;une demande de devis via le formulaire dédié.</li>
          </ul>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">8. Durée de conservation</h2>
          <p>
            Les données sont conservées pendant la durée nécessaire aux finalités poursuivies, puis archivées ou
            supprimées conformément à la réglementation applicable et à nos obligations légales.
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Données de compte : pendant la relation contractuelle, puis archivage selon obligations légales.</li>
            <li>Données de contact / devis : jusqu&apos;à 3 ans après le dernier contact actif.</li>
            <li>Données comptables et facturation : jusqu&apos;à 10 ans selon obligations légales.</li>
            <li>Logs techniques et cookies de mesure : durées limitées et proportionnées.</li>
          </ul>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">9. Destinataires des données</h2>
          <p>
            Les données sont accessibles, dans la limite de leurs attributions, aux équipes habilitées de Gaston
            Stock et à ses sous-traitants techniques (hébergement, envoi d&apos;emails, maintenance), strictement
            encadrés contractuellement.
          </p>
          <p>
            Les données peuvent également être communiquées aux autorités compétentes lorsque la loi l&apos;impose.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">10. Sous-traitants principaux</h2>
          <p>
            Nous pouvons recourir à des prestataires pour l&apos;hébergement, l&apos;authentification, l&apos;envoi d&apos;emails,
            l&apos;assistance ou la maintenance. Ces prestataires sont choisis pour leur niveau de sécurité et encadrés
            contractuellement.
          </p>
          <p>
            <strong>Exemples de catégories de sous-traitants :</strong> hébergement cloud, envoi transactionnel
            d&apos;emails, supervision technique, outils de support.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">11. Hébergement et transferts hors UE</h2>
          <p>
            Les données sont hébergées sur des infrastructures cloud sécurisées. Lorsque cela est requis, les données
            sont hébergées au sein de l&apos;Union européenne ou encadrées par des garanties appropriées en cas de
            transfert hors UE (clauses contractuelles types, mesures de sécurité complémentaires).
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">12. Sécurité des données</h2>
          <p>
            Gaston Stock met en œuvre des mesures techniques et organisationnelles adaptées pour protéger les données
            personnelles contre l&apos;accès non autorisé, la perte, l&apos;altération ou la divulgation (contrôles
            d&apos;accès, chiffrement des flux, journalisation, sauvegardes).
          </p>
          <p>
            En cas de violation de données présentant un risque pour vos droits et libertés, vous serez informé(e)
            dans les conditions prévues par le RGPD.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">13. Vos droits RGPD</h2>
          <p>
            Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants : accès,
            rectification, effacement, limitation, opposition, portabilité et définition du sort des données après
            décès.
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li><strong>Droit d&apos;accès :</strong> obtenir une copie de vos données traitées.</li>
            <li><strong>Droit de rectification :</strong> corriger des informations inexactes.</li>
            <li><strong>Droit d&apos;effacement :</strong> demander la suppression de vos données dans les cas prévus.</li>
            <li><strong>Droit d&apos;opposition :</strong> vous opposer à certains traitements, notamment la prospection.</li>
            <li><strong>Droit de limitation :</strong> geler temporairement un traitement dans certaines situations.</li>
            <li><strong>Droit à la portabilité :</strong> récupérer vos données dans un format exploitable.</li>
          </ul>
          <p>
            Vous pouvez exercer ces droits en écrivant à <strong>contact@gastonstock.com</strong>. En cas de doute
            raisonnable sur l&apos;identité du demandeur, un justificatif pourra être demandé.
          </p>
          <p>
            Vous disposez également du droit d&apos;introduire une réclamation auprès de la CNIL (
            <a className="text-blue-700 hover:underline" href="https://www.cnil.fr" target="_blank" rel="noreferrer">
              www.cnil.fr
            </a>
            ).
          </p>
          <p>
            <strong>Modalités d&apos;exercice :</strong> votre demande doit préciser l&apos;objet du droit exercé et être
            adressée à contact@gastonstock.com. Une vérification d&apos;identité peut être demandée en cas de doute
            raisonnable.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">14. Cookies et traceurs</h2>
          <p>
            Le site et l&apos;application peuvent utiliser des cookies strictement nécessaires au fonctionnement, ainsi
            que, le cas échéant, des cookies de mesure d&apos;audience. Un bandeau d&apos;information et de gestion du
            consentement peut être mis en place selon les technologies utilisées.
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li><strong>Cookies nécessaires :</strong> indispensables au fonctionnement du service.</li>
            <li><strong>Cookies de mesure :</strong> statistiques d&apos;usage et amélioration de l&apos;expérience.</li>
            <li><strong>Cookies tiers :</strong> déposés par des prestataires techniques selon vos choix.</li>
          </ul>
          <p>
            Vous pouvez à tout moment modifier vos préférences cookies depuis votre navigateur ou via le gestionnaire
            de consentement lorsqu&apos;il est disponible.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">15. Mineurs</h2>
          <p>
            Le service Gaston Stock est destiné à un usage professionnel. Il n&apos;est pas destiné aux mineurs. Si vous
            pensez qu&apos;un mineur nous a transmis des données personnelles, merci de nous contacter afin que nous
            puissions procéder aux vérifications et, le cas échéant, à la suppression.
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">16. Réclamations et autorité de contrôle</h2>
          <p>
            Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous pouvez déposer
            une réclamation auprès de la CNIL :{' '}
            <a className="text-blue-700 hover:underline" href="https://www.cnil.fr" target="_blank" rel="noreferrer">
              https://www.cnil.fr
            </a>
            .
          </p>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
          <h2 className="text-xl font-semibold text-[#0a1f44]">17. Mise à jour de la politique</h2>
          <p>
            La présente politique peut être modifiée à tout moment pour tenir compte des évolutions légales,
            réglementaires ou techniques. La date de mise à jour figurant en en-tête fait foi.
          </p>
        </section>

        <div className="mt-10 border-t border-slate-200 pt-6 text-sm">
          <Link href="/" className="text-blue-700 hover:underline">
            Retour à la page d&apos;accueil
          </Link>
        </div>
      </div>
    </main>
  );
}

