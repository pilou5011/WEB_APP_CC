import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Routes publiques (pas besoin d'authentification)
  const publicRoutes = ['/auth'];
  const isPublicRoute = publicRoutes.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  );

  // Pour les routes publiques, pas besoin de vérifier la session
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // La vérification de l'authentification se fait côté client dans les pages
  // Le middleware sert juste à laisser passer les requêtes
  return NextResponse.next();
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

