-- Migration pour l'intégration Stripe
-- Ajout de la gestion des abonnements et des statuts de paiement

-- 1. Ajouter les colonnes Stripe à la table companies
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'pending_payment' CHECK (subscription_status IN ('pending_payment', 'active', 'suspended')),
ADD COLUMN IF NOT EXISTS has_paid_entry_fee BOOLEAN DEFAULT false;

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer_id ON companies(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_companies_subscription_status ON companies(subscription_status);

-- 2. Créer la table subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('standard', 'premium')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  extra_users_count INTEGER DEFAULT 0 CHECK (extra_users_count >= 0),
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'trial', 'active', 'past_due', 'canceled')),
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT unique_company_subscription UNIQUE(company_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- 3. Créer la table stripe_events pour éviter les doublons de webhooks
CREATE TABLE IF NOT EXISTS stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour vérifier rapidement si un event a déjà été traité
CREATE INDEX IF NOT EXISTS idx_stripe_events_stripe_event_id ON stripe_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_type ON stripe_events(event_type);

-- 4. Politique RLS (Row Level Security) pour subscriptions
-- Activer RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- Politique : Les utilisateurs peuvent voir les abonnements de leur entreprise
CREATE POLICY "Users can view their company subscription"
  ON subscriptions
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM user_profile 
      WHERE id = auth.uid()
    )
  );

-- Politique : Seuls les admins peuvent modifier les abonnements (via backend API)
-- Les modifications normales se font via webhooks Stripe (service role)
CREATE POLICY "Only service role can modify subscriptions"
  ON subscriptions
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Politique : stripe_events n'est accessible qu'en service role
CREATE POLICY "Only service role can access stripe_events"
  ON stripe_events
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- 5. Fonction helper pour vérifier si une entreprise a un accès valide
CREATE OR REPLACE FUNCTION check_company_access(p_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_paid_entry_fee BOOLEAN;
  v_subscription_status TEXT;
BEGIN
  -- Récupérer le statut de paiement et d'abonnement
  SELECT has_paid_entry_fee, subscription_status
  INTO v_has_paid_entry_fee, v_subscription_status
  FROM companies
  WHERE id = p_company_id;
  
  -- Vérifier que l'entreprise a payé les frais d'entrée ET a un abonnement actif
  RETURN (v_has_paid_entry_fee = true AND v_subscription_status = 'active');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Commentaires pour documentation
COMMENT ON TABLE subscriptions IS 'Gestion des abonnements Stripe par entreprise';
COMMENT ON TABLE stripe_events IS 'Log des événements Stripe pour éviter les doublons de webhooks';
COMMENT ON COLUMN companies.stripe_customer_id IS 'ID du customer Stripe associé à l''entreprise';
COMMENT ON COLUMN companies.subscription_status IS 'Statut de l''abonnement: pending_payment, active, suspended';
COMMENT ON COLUMN companies.has_paid_entry_fee IS 'Indique si l''entreprise a payé les frais d''activation initiaux (paiement one-shot manuel)';
COMMENT ON COLUMN subscriptions.plan_type IS 'Type de plan: standard ou premium';
COMMENT ON COLUMN subscriptions.billing_cycle IS 'Cycle de facturation: monthly ou yearly';
COMMENT ON COLUMN subscriptions.extra_users_count IS 'Nombre d''utilisateurs supplémentaires au-delà du plan de base';
COMMENT ON COLUMN subscriptions.status IS 'Statut Stripe: inactive, trial, active, past_due, canceled';

