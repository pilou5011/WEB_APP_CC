'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { LANDING_FAQ_ITEMS } from '@/lib/landing-faq';

export default function LandingClient() {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const recipient = 'contact@gastonstock.com';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setFeedback('');

    const formData = new FormData(form);
    const nom = String(formData.get('nom') || '').trim();
    const prenom = String(formData.get('prenom') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const telephone = String(formData.get('telephone') || '').trim();
    const entreprise = String(formData.get('entreprise') || '').trim();
    const message = String(formData.get('message') || '').trim();

    if (!nom || !prenom || !email || !telephone || !entreprise || !message) {
      setFeedback("Merci de remplir tous les champs avant l'envoi.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch('/api/send-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nom,
          prenom,
          email,
          telephone,
          entreprise,
          message,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setFeedback(payload?.error || "Erreur lors de l'envoi de votre demande.");
        return;
      }

      setFeedback('Votre demande a bien été envoyée. Nous vous recontactons rapidement.');
      form.reset();
    } catch (error) {
      console.error('Erreur envoi devis:', error);
      setFeedback("Impossible d'envoyer la demande pour le moment. Merci de réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="bg-white text-slate-800 antialiased">
      <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-white/85">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6 sm:py-3">
          <Link
            href="/"
            className="min-w-0 text-left text-xs font-semibold uppercase tracking-wide text-blue-600 sm:text-sm"
          >
            <span className="line-clamp-2 sm:line-clamp-1">
              Gaston Stock • Spécialiste du dépôt-vente
            </span>
          </Link>
          <Link
            href="/auth"
            className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 sm:px-4 sm:text-sm"
          >
            Connexion / Créer un compte
          </Link>
        </div>
      </header>
      <section
        id="hero"
        className="bg-[radial-gradient(circle_at_10%_20%,rgba(15,111,255,0.15),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(12,87,202,0.15),transparent_40%),linear-gradient(180deg,#f9fbff_0%,#ffffff_60%)]"
      >
        <div className="mx-auto grid max-w-7xl gap-12 px-6 pb-14 pt-4 md:grid-cols-2 md:pb-20 md:pt-6">
          <div>
            <h1 className="text-4xl font-bold leading-tight text-[#0B1F33] md:text-5xl">
              <span className="block">
                <span className="font-extrabold text-blue-600">LA</span> solution gestion et
              </span>
              <span className="mt-1 block md:mt-2">
                facturation <span className="font-extrabold text-blue-600">dépôt-vente</span>
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-600">
              Avec Gaston Stock, vous gérez votre activité de dépôt-vente en magasin, suivez vos ventes et
              facturez en toute sérénité. 
              Moins d’administratif, plus de pilotage.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#devis"
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
              >
                Demander un devis
              </a>
              <a
                href="#solution"
                className="rounded-lg border border-slate-200 px-6 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
              >
                Voir la solution
              </a>
              <button
                type="button"
                onClick={() => setShowContactInfo((prev) => !prev)}
                className="rounded-lg border border-blue-600 px-6 py-3 font-semibold text-blue-600 transition hover:bg-blue-50"
              >
                Nous contacter
              </button>
            </div>
            {showContactInfo && (
              <div className="mt-4 w-full max-w-xl rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-[#0B1F33]">Besoin d&apos;échanger rapidement ? Contactez-nous :</p>
                <p className="mt-2">
                  Email : <a href={`mailto:${recipient}`} className="text-blue-600 underline hover:no-underline">{recipient}</a>
                </p>
                <p>
                  Téléphone : <a href="tel:+33623937452" className="text-blue-600 underline hover:no-underline">06 23 93 74 52</a>
                </p>
              </div>
            )}
            <div className="mt-8 grid grid-cols-3 gap-4 text-sm text-slate-600">
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_10px_30px_rgba(13,26,51,0.08)]">
                <p className="text-xl font-bold text-[#0B1F33]">-40%</p>
                <p>de temps administratif</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_10px_30px_rgba(13,26,51,0.08)]">
                <p className="text-xl font-bold text-[#0B1F33]">100%</p>
                <p>dédié dépôt-vente</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_10px_30px_rgba(13,26,51,0.08)]">
                <p className="text-xl font-bold text-[#0B1F33]">Conforme</p>
                <p>facturation et suivi</p>
              </div>
            </div>
          </div>
          <div className="relative mt-8 md:mt-10">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(13,26,51,0.08)]">
              <div className="mb-4 rounded-xl bg-slate-100 p-2 text-xs text-slate-500">
                Aperçu de l’interface Gaston Stock 
              </div>
              <div className="space-y-3">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">Dépôts en cours</p>
                  <p className="mt-1 text-2xl font-bold text-[#0B1F33]">324</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Ventes du jour</p>
                    <p className="text-lg font-bold text-[#0B1F33]">4 280 EUR</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Commissions</p>
                    <p className="text-lg font-bold text-[#0B1F33]">812 EUR</p>
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Factures émises</p>
                  <p className="text-lg font-bold text-[#0B1F33]">38 ce mois-ci</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pt-8">
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-[0_10px_30px_rgba(13,26,51,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Information importante</p>
          <h2 className="mt-2 text-2xl font-bold text-[#0B1F33]">
            Pensé pour la{' '}
            <span className="font-extrabold text-blue-600">
              Facturation électronique
            </span>{' '}
            en dépôt-vente
          </h2>
          <p className="mt-2 max-w-3xl text-slate-700">
            Gaston Stock vous accompagne sur la transition réglementaire avec une solution de facturation électronique
            dépôt-vente pensée pour votre activité.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="text-3xl font-bold text-[#0B1F33]">Les difficultés concrètes du dépôt-vente</h2>
        <p className="mt-3 max-w-3xl text-slate-600">
          Vous confiez vos produits en dépôt-vente à des points de vente physiques, puis vous intervenez à des
          intervalles variables pour constater les ventes
          réalisées et procéder à la régularisation (gestion du stock, commissions, facturation). Entre deux passages, ce cycle
          repose encore trop souvent sur des{' '}
          <span className="font-semibold tracking-wide">traitements manuels</span> et des{' '}
          <span className="font-semibold tracking-wide">outils divers</span> (tableurs, documents papier,
          échanges informels) : les saisies multiples, les relances et les recoupements mobilisent une part importante
          du temps opérationnel, au détriment du cœur de métier.   
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            [
              'Un cycle irrégulier à piloter',
              'Les relevés sont espacés dans le temps : sans historique centralisé, il est facile de perdre le fil entre le dernier dépôt et le stock compté au retour.',
            ],
            [
              'Une gestion encore trop manuelle',
              'Carnets, fichiers Excel ou mails : la même information est souvent saisie plusieurs fois, ce qui multiplie les risques d’erreur opérationnelle au moment du relevé, de la facturation ou des restitutions.',
            ],
            [
              'Relever le stock vendu est complexe',
              'À chaque visite, il faut croiser stock compté, nouveau dépôt, ventes réelles et éventuelles reprises de stock — un puzzle vite ingérable à la main.',
            ],
            [
              'Peu de visibilité entre deux passages',
              'Pendant les semaines ou mois sans relevé, vous manquez d’une vision fiable et à jour pour anticiper vos ventes et préparer vos tournées.',
            ],
            [
              'Facturation et commissions fragiles',
              'Une fois le stock vendu établi, les montants, commissions et obligations fiscales dépendent encore trop de calculs isolés, sources d’erreurs et de contestations.',
            ],
            [
              'Perte de temps lors des tournées',
              'Quand vous intervenez chez le client, tout doit être prêt et cohérent : sans outil dédié, la préparation reste stressante et chronophage.',
            ],
          ].map(([title, content]) => (
            <article
              key={title}
              className="rounded-xl border border-slate-200 p-5 transition hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(13,26,51,0.08)]"
            >
              <h3 className="font-semibold text-[#0B1F33]">{title}</h3>
              <p className="mt-2 text-sm text-slate-600">{content}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="solution" className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-3xl font-bold text-[#0B1F33]">
            Gestion dépôt-vente : la solution métier Gaston Stock
          </h2>
          <p className="mt-3 max-w-3xl text-slate-600">
            Gaston Stock est pensé pour les professionnels qui enchaînent dépôts en point de vente et relevés espacés
            dans le temps. L&apos;application structure tout le cycle pour remplacer une gestion encore trop manuelle
            par un fil conducteur unique et traçable. Du bon de dépôt au relevé de stock, en passant par la gestion du réassort et la facturation, 
            Gaston Stock est une application sur mesure pour votre activité qui vous aide à remplacer cette gestion manuelle par un fil conducteur unique et traçable. 
            Plus de confusion, plus de perte de temps, plus de stress.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              [
                'Dépôts et produits suivis dans la durée',
                'Enregistrez ce qui est confié en magasin et retrouvez l’état des dépôts au moment où vous revenez, en profitant d’une gestion simplifiée et centralisée.',
              ],
              [
                'Relevés de stock vendu maîtrisés',
                'À chaque passage, saisissez le stock compté et le nouveau dépôt : Gaston Stock aide à déduire ce qui a été vendu et à documenter le cycle de votre métier.',
              ],
              [
                'Facturation alignée sur le terrain',
                'À partir des mouvements réels, émettez des documents cohérents et conformes, sans recalculs parallèles sur tableur.',
              ],
              [
                'Commissions et reprises de stock claires',
                'Gardez une trace des ajustements et calculez commissions et reversements sur une base unique, partagée entre vous et le point de vente.',
              ],
            ].map(([title, content]) => (
              <div key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(13,26,51,0.08)]">
                <h3 className="font-semibold text-[#0B1F33]">{title}</h3>
                <p className="mt-2 text-sm text-slate-600">{content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="fonctionnalites" className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="text-3xl font-bold text-[#0B1F33]">Logiciel dépôt-vente : fonctionnalités clés</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            ['👥', 'Gestion des clients', 'Fiches complètes, historique des dépôts, suivi des ventes et aide à la préparation des tournées.'],
            ['📦', 'Gestion des produits et du stock', 'Vision claire des articles déposés chez vos clients.'],
            ['🧾', 'Facturation dépôt-vente conforme', 'Documents clairs et conformes pour limiter les erreurs administratives. Compatible avec la facturation électronique.'],
            ['📊', 'Relevé de stock et suivi de ventes', "Visualisation claire des ventes et analyses des ventes passées."],
            ['🧮', 'Commissions et reprises de stock', 'Calcul automatique des factures, du bon de dépôt, et gardez une traçabilité fiable.'],
            ['📁', 'Bon de dépôt, exports et reporting', 'Générez vos documents et facilitez la comptabilité. Exportez facilement vos données pour la comptabilité.'],
          ].map(([icon, title, content]) => (
            <article key={title} className="rounded-xl border border-slate-200 p-5 transition hover:border-blue-300 hover:shadow-[0_10px_30px_rgba(13,26,51,0.08)]">
              <p className="text-2xl">{icon}</p>
              <h3 className="mt-2 font-semibold text-[#0B1F33]">{title}</h3>
              <p className="mt-2 text-sm text-slate-600">{content}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#0B1F33] py-16 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-3xl font-bold">Pourquoi nous choisir</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {[
              '100% dépôt-vente',
              'Prise en main rapide',
              'Gain de temps concret',
              'Suivi terrain clair',
              'Conformité légale',
            ].map((item) => (
              <div key={item} className="rounded-xl border border-white/20 bg-white/5 p-4">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16" aria-labelledby="seo-title">
        <h2 id="seo-title" className="text-3xl font-bold text-[#0B1F33]">
          Logiciel dépôt-vente : pourquoi choisir Gaston Stock
        </h2>
        <p className="mt-4 max-w-4xl text-slate-600">
          Si vous recherchez un <strong>logiciel dépôt-vente</strong> pour la <strong>gestion dépôt-vente</strong> et la{' '}
          <strong>facturation dépôt-vente</strong>, Gaston Stock centralise dépôts, relevés et commissions. La
          plateforme vous prépare aussi à la <strong>facturation électronique dépôt-vente</strong> sur des bases fiables.
        </p>
      </section>

      <section id="facturation-electronique" className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-3xl font-bold text-[#0B1F33]">
            Facturation électronique dépôt-vente : anticiper l&apos;obligation
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ['Une obligation qui arrive', 'Les règles évoluent et demandent des données structurées et fiables.'],
              ['Un enjeu de conformité', 'Anticiper maintenant évite les urgences et les solutions de dernière minute.'],
              ['Un accompagnement progressif', 'Gaston Stock vous aide à gérer votre activité sans complexifier votre quotidien.'],
            ].map(([title, content]) => (
              <article key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(13,26,51,0.08)]">
                <h3 className="font-semibold text-[#0B1F33]">{title}</h3>
                <p className="mt-2 text-sm text-slate-600">{content}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-[#0B1F33]">FAQ</h2>
          <div className="mt-6 space-y-3">
            {LANDING_FAQ_ITEMS.map(([q, a]) => (
              <details key={q} className="rounded-xl border border-slate-200 bg-white p-4">
                <summary className="cursor-pointer list-none font-semibold text-[#0B1F33]">{q}</summary>
                <p className="mt-2 text-sm text-slate-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="devis" className="py-16">
        <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white px-6 py-10 shadow-[0_10px_30px_rgba(13,26,51,0.08)]">
          <h2 className="text-3xl font-bold text-[#0B1F33]">Parlons de votre activité</h2>
          <p className="mt-3 text-slate-600">
            Décrivez votre organisation actuelle (fréquence des dépôts, volume de produits, mode de facturation). Indiquez
            aussi votre numéro de téléphone pour que nous puissions vous recontacter facilement. Nous revenons vers vous
            avec une proposition claire et adaptée.
          </p>
          <form id="quote-form" className="mt-8 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="nom">
                Nom
              </label>
              <input id="nom" name="nom" type="text" required className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="prenom">
                Prénom
              </label>
              <input id="prenom" name="prenom" type="text" required className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
                Email
              </label>
              <input id="email" name="email" type="email" autoComplete="email" required className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="telephone">
                Téléphone <span className="font-normal text-slate-500">(pour vous recontacter)</span>
              </label>
              <input
                id="telephone"
                name="telephone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                placeholder="Ex. : 06 12 34 56 78"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="entreprise">
                Nom de l&apos;entreprise
              </label>
              <input id="entreprise" name="entreprise" type="text" required className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="message">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Ex. : dépôt-vente dans le prêt-à-porter, articles confiés en magasins partenaires, relevés environ tous les 6 à 8 semaines — objectif : mieux suivre stock vendu, facturation et commissions."
              />
            </div>
            <div className="md:col-span-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {isSubmitting ? 'Envoi en cours...' : 'Demander un devis'}
              </button>
              <p className="text-sm text-slate-500">Réponse rapide par email.</p>
            </div>
            <p
              className={`md:col-span-2 text-sm ${
                feedback.startsWith('Votre demande a bien été envoyée') ? 'text-emerald-700' : 'text-red-600'
              }`}
              role="status"
              aria-live="polite"
            >
              {feedback}
            </p>
          </form>
        </div>
      </section>

      <section className="bg-[#0B1F33] py-14 text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 px-6 text-center">
          <h2 className="text-3xl font-bold">Transformez la gestion de votre dépôt-vente avec Gaston Stock</h2>
          <p className="max-w-2xl text-white/85">
            Une solution spécialisée, claire et fiable pour piloter votre activité. 
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a href="#devis" className="rounded-lg bg-white px-6 py-3 font-semibold text-[#0B1F33] transition hover:bg-slate-100">
              Demander un devis
            </a>
            <button
              type="button"
              onClick={() => setShowContactInfo((prev) => !prev)}
              className="rounded-lg border border-white/70 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Nous contacter
            </button>
          </div>
          {showContactInfo && (
            <div className="w-full max-w-xl rounded-xl border border-white/25 bg-white/10 p-4 text-sm text-white/95">
              <p className="font-semibold">Besoin d&apos;échanger rapidement ? Contactez-nous :</p>
              <p className="mt-2">
                Email : <a href={`mailto:${recipient}`} className="underline hover:no-underline">{recipient}</a>
              </p>
              <p>
                Téléphone : <a href="tel:+33623937452" className="underline hover:no-underline">06 23 93 74 52</a>
              </p>
            </div>
          )}
        </div>
      </section>

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
              <a href="#devis" className="text-[#0B1F33] font-medium underline decoration-[#0B1F33]/30 underline-offset-2 hover:decoration-[#0B1F33]">
                Demander un devis
              </a>
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Email :{' '}
              <a href={`mailto:${recipient}`} className="text-slate-600 underline hover:text-[#0B1F33]">
                {recipient}
              </a>
            </p>
            <p className="text-sm text-slate-600">
              Tél :{' '}
              <a href="tel:+33623937452" className="text-slate-600 underline hover:text-[#0B1F33]">
                06 23 93 74 52
              </a>
            </p>
          </div>
          <div>
            <p className="font-semibold text-[#0B1F33]">Informations légales</p>
            <p className="mt-2 text-sm">
              <Link href="/mentions-legales" className="text-slate-600 hover:text-blue-600 hover:underline">
                Mentions légales
              </Link>
            </p>
            <p className="text-sm">
              <Link href="/politique-confidentialite" className="text-slate-600 hover:text-blue-600 hover:underline">
                Politique de confidentialité
              </Link>
            </p>
            <p className="text-sm">
              <Link href="/conditions-generales-utilisation" className="text-slate-600 hover:text-blue-600 hover:underline">
                Conditions Générales d&apos;Utilisation
              </Link>
            </p>
            <p className="mt-2 text-sm text-slate-600">
              <Link href="/app" className="text-blue-600 hover:text-blue-700 hover:underline">
                Retour à l&apos;application
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
