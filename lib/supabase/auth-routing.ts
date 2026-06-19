type CookieLike = { name: string; value?: string };

export const KNOWN_ACCOUNT_COOKIE = 'gaston_known_account';

export function hasSupabaseAuthCookies(cookies: CookieLike[]): boolean {
  return cookies.some(
    (cookie) => cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token')
  );
}

export function hasKnownAccountCookie(cookies: CookieLike[]): boolean {
  return cookies.some(
    (cookie) => cookie.name === KNOWN_ACCOUNT_COOKIE && cookie.value === '1'
  );
}

/** Server-side: redirect to /auth when browser has previously used an account. */
export function shouldRedirectHomeToAuth(cookies: CookieLike[]): boolean {
  return hasSupabaseAuthCookies(cookies) || hasKnownAccountCookie(cookies);
}

export function setKnownAccountCookieClient(): void {
  if (typeof document === 'undefined') return;
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${KNOWN_ACCOUNT_COOKIE}=1; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function hasLegacySupabaseAuthStorage(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return Object.keys(localStorage).some(
      (key) => key.startsWith('sb-') && key.includes('-auth-token')
    );
  } catch {
    return false;
  }
}

/**
 * Runs before React hydration on `/` when server could not decide.
 * Never redirects to /app — only /auth for legacy localStorage traces.
 */
export const homeKnownAccountRedirectScript = `
(function () {
  try {
    var keys = Object.keys(localStorage);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (key.indexOf('sb-') !== 0 || key.indexOf('-auth-token') === -1) continue;
      document.cookie = '${KNOWN_ACCOUNT_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax';
      window.location.replace('/auth');
      return;
    }
  } catch (e) {}
})();
`;
