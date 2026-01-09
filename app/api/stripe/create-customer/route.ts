/**
 * API Route: Création d'un customer Stripe
 * POST /api/stripe/create-customer
 * 
 * Crée un customer Stripe pour une entreprise et met à jour la base de données
 * ⚠️ Cette route est appelée automatiquement lors de la création d'une company
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';
import { CreateCustomerPayload } from '@/types/stripe';

// Initialiser Supabase avec le service role key pour les opérations admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Parser le body
    const body: CreateCustomerPayload = await request.json();
    const { company_id, email, name, metadata } = body;

    // Validation
    if (!company_id || !email || !name) {
      return NextResponse.json(
        { error: 'Paramètres manquants: company_id, email, name requis' },
        { status: 400 }
      );
    }

    // Vérifier que la company existe et n'a pas déjà un customer Stripe
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, stripe_customer_id, name')
      .eq('id', company_id)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Entreprise non trouvée' },
        { status: 404 }
      );
    }

    // Si un customer existe déjà, le retourner
    if (company.stripe_customer_id) {
      console.log(`Customer Stripe existe déjà pour company ${company_id}: ${company.stripe_customer_id}`);
      return NextResponse.json({
        customer_id: company.stripe_customer_id,
        message: 'Customer Stripe existant',
        existing: true
      });
    }

    // Créer le customer dans Stripe
    console.log(`Création d'un customer Stripe pour company ${company_id}...`);
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        company_id,
        ...metadata
      },
      description: `Customer pour ${name} (Company ID: ${company_id})`,
    });

    console.log(`Customer Stripe créé: ${customer.id}`);

    // Mettre à jour la company avec le stripe_customer_id
    const { error: updateError } = await supabaseAdmin
      .from('companies')
      .update({ 
        stripe_customer_id: customer.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', company_id);

    if (updateError) {
      console.error('Erreur lors de la mise à jour de la company:', updateError);
      // Le customer Stripe est créé mais pas lié en DB
      // On pourrait tenter de supprimer le customer ou le laisser pour debug
      return NextResponse.json(
        { error: 'Erreur lors de la liaison du customer Stripe' },
        { status: 500 }
      );
    }

    console.log(`Company ${company_id} mise à jour avec stripe_customer_id: ${customer.id}`);

    return NextResponse.json({
      customer_id: customer.id,
      message: 'Customer Stripe créé avec succès',
      existing: false
    });

  } catch (error: any) {
    console.error('Erreur lors de la création du customer Stripe:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la création du customer Stripe',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

