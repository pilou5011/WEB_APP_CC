import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { shouldRedirectHomeToAuth } from '@/lib/supabase/auth-routing';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(req: NextRequest) {
  const { supabaseResponse, user } = await updateSession(req);
  const pathname = req.nextUrl.pathname;

  if (pathname.startsWith('/auth/callback')) {
    return supabaseResponse;
  }

  if (pathname === '/') {
    if (user) {
      const url = req.nextUrl.clone();
      url.pathname = '/app';
      return NextResponse.redirect(url);
    }

    if (shouldRedirectHomeToAuth(req.cookies.getAll())) {
      const url = req.nextUrl.clone();
      url.pathname = '/auth';
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  if (pathname.startsWith('/app') && !user) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth';
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/auth') && user) {
    const url = req.nextUrl.clone();
    url.pathname = '/app';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
