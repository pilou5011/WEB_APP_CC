/**
 * Page de gestion d'abonnement
 * Affiche l'état de l'abonnement, permet de changer de plan, ajouter des utilisateurs
 * et gérer les moyens de paiement via Stripe Customer Portal
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, CheckCircle, XCircle, Clock, CreditCard, Users, Calendar, Download } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Subscription,
  CompanyStripeData,
  getSubscriptionStatusLabel,
  getPlanLabel,
  getBillingCycleLabel,
  PLAN_CONFIGS
} from '@/types/stripe';

interface Company extends CompanyStripeData {
  id: string;
  name: string;
}

export default function SubscriptionPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [userCount, setUserCount] = useState(0);
  const [loadingPortal, setLoadingPortal] = useState(false);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);

      // Récupérer l'utilisateur actuel
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      // Récupérer le profil et la company
      const { data: profile } = await supabase
        .from('user_profile')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        toast.error('Profil utilisateur non trouvé');
        return;
      }

      // Récupérer les infos de la company
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single();

      if (companyError || !companyData) {
        toast.error('Entreprise non trouvée');
        return;
      }

      setCompany(companyData);

      // Récupérer l'abonnement s'il existe
      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('company_id', profile.company_id)
        .maybeSingle();

      setSubscription(subscriptionData);

      // Compter les utilisateurs de la company
      const { count } = await supabase
        .from('user_profile')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id);

      setUserCount(count || 0);

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const openCustomerPortal = async () => {
    if (!company?.stripe_customer_id) {
      toast.error('Aucun compte Stripe associé');
      return;
    }

    try {
      setLoadingPortal(true);

      // Appeler l'API pour créer une session portal
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: company.stripe_customer_id,
          return_url: window.location.href,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la création de la session portal');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'ouverture du portail de gestion');
    } finally {
      setLoadingPortal(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'trial':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Actif</Badge>;
      case 'past_due':
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />En retard</Badge>;
      case 'canceled':
      case 'inactive':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Inactif</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            Impossible de charger les informations de votre entreprise.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Vérifier si l'accès est bloqué
  const isAccessBlocked = !company.has_paid_entry_fee || company.subscription_status !== 'active';

  // Calculer les limites selon le plan
  const planLimits = subscription ? PLAN_CONFIGS[subscription.plan_type] : null;
  const maxUsers = planLimits ? planLimits.max_users + (subscription?.extra_users_count || 0) : 1;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mon abonnement</h1>
          <p className="text-muted-foreground">
            Gérez votre abonnement et vos utilisateurs
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/')}>
          Retour à l'accueil
        </Button>
      </div>

      {/* Alerte si accès bloqué */}
      {isAccessBlocked && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Accès restreint</AlertTitle>
          <AlertDescription>
            {!company.has_paid_entry_fee && (
              <p>Les frais d'activation n'ont pas encore été payés. Contactez le support pour activer votre compte.</p>
            )}
            {company.has_paid_entry_fee && company.subscription_status !== 'active' && (
              <p>Votre abonnement est suspendu. Veuillez mettre à jour votre moyen de paiement ou contacter le support.</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* État de l'entreprise */}
        <Card>
          <CardHeader>
            <CardTitle>Entreprise</CardTitle>
            <CardDescription>{company.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Frais d'activation</span>
              {company.has_paid_entry_fee ? (
                <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Payés</Badge>
              ) : (
                <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Non payés</Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Statut d'accès</span>
              {getStatusBadge(company.subscription_status)}
            </div>
          </CardContent>
        </Card>

        {/* Abonnement actuel */}
        <Card>
          <CardHeader>
            <CardTitle>Abonnement actuel</CardTitle>
            <CardDescription>
              {subscription ? getPlanLabel(subscription.plan_type) : 'Aucun abonnement'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscription ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Statut</span>
                  {getStatusBadge(subscription.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Facturation</span>
                  <span className="text-sm font-medium">{getBillingCycleLabel(subscription.billing_cycle)}</span>
                </div>
                {subscription.activated_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Activé le</span>
                    <span className="text-sm font-medium">
                      {new Date(subscription.activated_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun abonnement actif</p>
            )}
          </CardContent>
        </Card>

        {/* Utilisateurs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Utilisateurs
            </CardTitle>
            <CardDescription>
              Gestion des utilisateurs de votre entreprise
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Utilisateurs actuels</span>
              <span className="text-2xl font-bold">{userCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Maximum autorisé</span>
              <span className="text-2xl font-bold">{maxUsers}</span>
            </div>
            {subscription && subscription.extra_users_count > 0 && (
              <p className="text-xs text-muted-foreground">
                Dont {subscription.extra_users_count} utilisateur(s) supplémentaire(s)
              </p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Gestion
            </CardTitle>
            <CardDescription>
              Gérez votre abonnement et vos paiements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {company.stripe_customer_id && (
              <Button
                className="w-full"
                onClick={openCustomerPortal}
                disabled={loadingPortal}
              >
                {loadingPortal ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Gérer mon abonnement
                  </>
                )}
              </Button>
            )}
            <p className="text-xs text-muted-foreground text-center">
              Vous serez redirigé vers le portail Stripe pour gérer votre abonnement,
              vos moyens de paiement et télécharger vos factures.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fonctionnalités du plan */}
      {planLimits && (
        <Card>
          <CardHeader>
            <CardTitle>Fonctionnalités incluses</CardTitle>
            <CardDescription>
              Fonctionnalités disponibles avec votre plan {getPlanLabel(subscription!.plan_type)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 md:grid-cols-2">
              {planLimits.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Support */}
      <Card>
        <CardHeader>
          <CardTitle>Besoin d'aide ?</CardTitle>
          <CardDescription>
            Notre équipe est là pour vous aider
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Pour toute question concernant votre abonnement, les frais d'activation
            ou pour ajouter des utilisateurs supplémentaires, contactez notre support.
          </p>
          <Button variant="outline" className="w-full" onClick={() => window.location.href = 'mailto:support@example.com'}>
            Contacter le support
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
