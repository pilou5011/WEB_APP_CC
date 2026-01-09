/**
 * API Route: Création d'une session Customer Portal Stripe
 * POST /api/stripe/customer-portal
 * 
 * Crée une session pour le portail client Stripe où l'utilisateur peut :
 * - Gérer ses moyens de paiement
 * - Voir et télécharger ses factures
 * - Annuler ou modifier son abonnement
 * - Mettre à jour ses informations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createCustomerPortalSession } from '@/lib/stripe';

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
    const body = await request.json();
    const { customer_id, return_url } = body;

    // Validation
    if (!customer_id) {
      return NextResponse.json(
        { error: 'customer_id requis' },
        { status: 400 }
      );
    }

    if (!return_url) {
      return NextResponse.json(
        { error: 'return_url requis' },
        { status: 400 }
      );
    }

    console.log(`Création d'une session portal pour customer ${customer_id}...`);

    // Créer la session portal
    const portalUrl = await createCustomerPortalSession(customer_id, return_url);

    console.log(`Session portal créée: ${portalUrl}`);

    return NextResponse.json({ url: portalUrl });

  } catch (error: any) {
    console.error('Erreur lors de la création de la session portal:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la création de la session portal',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

