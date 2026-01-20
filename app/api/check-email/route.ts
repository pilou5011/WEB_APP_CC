import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Cette route utilise le service role pour contourner RLS
// et vérifier si un email existe déjà dans la table users
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email requis' },
        { status: 400 }
      );
    }

    // Utiliser le service role key pour contourner RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      const debugInfo = {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        urlLength: supabaseUrl?.length || 0,
        keyLength: supabaseServiceKey?.length || 0,
        keyStartsWith: supabaseServiceKey?.substring(0, 10) || 'N/A'
      };
      
      console.error('Configuration Supabase manquante:', debugInfo);
      
      return NextResponse.json(
        { 
          error: 'Configuration serveur manquante',
          details: 'SUPABASE_SERVICE_ROLE_KEY doit être configurée dans les variables d\'environnement',
          debug: process.env.NODE_ENV === 'development' ? debugInfo : undefined
        },
        { status: 500 }
      );
    }

    // Créer un client avec le service role (contourne RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Vérifier si l'email existe dans la table users
    const { data: existingUser, error } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('Erreur lors de la vérification de l\'email:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la vérification' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exists: !!existingUser,
      email: email.trim().toLowerCase()
    });
  } catch (error: any) {
    console.error('Erreur dans check-email API:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

