/** URL publique canonique (sans slash final). Utiliser NEXT_PUBLIC_SITE_URL en prod. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gastonstock.com'
).replace(/\/+$/, '');

export function absoluteUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${p}`;
}
