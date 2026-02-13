/*
  # Correction des politiques RLS pour draft_invoices et draft_credit_notes
  
  Cette migration corrige un problème de sécurité critique : les politiques RLS
  pour draft_invoices et draft_credit_notes utilisaient USING (true), permettant
  l'accès à tous les brouillons de toutes les entreprises.
  
  Cette migration remplace ces politiques par des politiques qui filtrent
  strictement par company_id.
*/

-- Supprimer les anciennes politiques publiques non sécurisées pour draft_invoices
DROP POLICY IF EXISTS "Allow public read access to draft_invoices" ON draft_invoices;
DROP POLICY IF EXISTS "Allow public insert access to draft_invoices" ON draft_invoices;
DROP POLICY IF EXISTS "Allow public update access to draft_invoices" ON draft_invoices;
DROP POLICY IF EXISTS "Allow public delete access to draft_invoices" ON draft_invoices;

-- Supprimer les anciennes politiques publiques non sécurisées pour draft_credit_notes
DROP POLICY IF EXISTS "Allow public read access to draft_credit_notes" ON draft_credit_notes;
DROP POLICY IF EXISTS "Allow public insert access to draft_credit_notes" ON draft_credit_notes;
DROP POLICY IF EXISTS "Allow public update access to draft_credit_notes" ON draft_credit_notes;
DROP POLICY IF EXISTS "Allow public delete access to draft_credit_notes" ON draft_credit_notes;

-- Créer les politiques RLS sécurisées pour draft_invoices
CREATE POLICY "Users can view draft_invoices in their company"
  ON draft_invoices FOR SELECT
  USING (company_id = public.user_company_id());

CREATE POLICY "Users can insert draft_invoices in their company"
  ON draft_invoices FOR INSERT
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "Users can update draft_invoices in their company"
  ON draft_invoices FOR UPDATE
  USING (company_id = public.user_company_id())
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "Users can delete draft_invoices in their company"
  ON draft_invoices FOR DELETE
  USING (company_id = public.user_company_id());

-- Créer les politiques RLS sécurisées pour draft_credit_notes
CREATE POLICY "Users can view draft_credit_notes in their company"
  ON draft_credit_notes FOR SELECT
  USING (company_id = public.user_company_id());

CREATE POLICY "Users can insert draft_credit_notes in their company"
  ON draft_credit_notes FOR INSERT
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "Users can update draft_credit_notes in their company"
  ON draft_credit_notes FOR UPDATE
  USING (company_id = public.user_company_id())
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "Users can delete draft_credit_notes in their company"
  ON draft_credit_notes FOR DELETE
  USING (company_id = public.user_company_id());

