import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  // Routes publiques (pas besoin d'authentification ni de vérification d'abonnement)
  const publicRoutes = ['/auth', '/api/stripe/webhook'];
  const isPublicRoute = publicRoutes.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  );

  // Pour les routes publiques, pas besoin de vérifier la session
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Routes qui ne nécessitent pas de vérification d'abonnement
  // (page d'abonnement elle-même, assets, API non-Stripe)
  const subscriptionExemptRoutes = ['/subscription', '/_next', '/api/send-invoice'];
  const isSubscriptionExempt = subscriptionExemptRoutes.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  );

  // Si route exemptée, laisser passer
  if (isSubscriptionExempt) {
    return NextResponse.next();
  }

  // Créer un client Supabase pour le middleware
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Vérifier l'authentification
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si pas authentifié, rediriger vers la page d'authentification
  if (!user) {
    const redirectUrl = new URL('/auth', req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Si authentifié, vérifier l'état de l'abonnement
  if (!isSubscriptionExempt) {
    // Récupérer le profil utilisateur et les infos de la company
    const { data: userProfile } = await supabase
      .from('user_profile')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (userProfile?.company_id) {
      // Récupérer les infos d'abonnement de la company
      const { data: company } = await supabase
        .from('companies')
        .select('has_paid_entry_fee, subscription_status')
        .eq('id', userProfile.company_id)
        .single();

      if (company) {
        // ⚠️ RÈGLE CRITIQUE: Bloquer l'accès si les conditions ne sont pas remplies
        const hasValidAccess = 
          company.has_paid_entry_fee === true && 
          company.subscription_status === 'active';

        if (!hasValidAccess) {
          // Rediriger vers la page d'abonnement
          const redirectUrl = new URL('/subscription', req.url);
          return NextResponse.redirect(redirectUrl);
        }
      }
    }
  }

  // Laisser passer la requête
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

